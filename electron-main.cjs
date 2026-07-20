const { app, BrowserWindow, protocol, net, ipcMain, shell } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const fs = require('fs');

let pyProcess = null;
let backendState = {
  status: 'not-started', // 'not-started', 'checking-python', 'checking-dependencies', 'installing-dependencies', 'starting', 'running', 'error', 'missing-python'
  error: null,
  logs: []
};

// Register the custom scheme before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function updateBackendStatus(status, error = null) {
  backendState.status = status;
  backendState.error = error;
  console.log(`[Backend Manager] Status: ${status}${error ? ' | Error: ' + error : ''}`);
  
  // Send to all open windows
  BrowserWindow.getAllWindows().forEach(win => {
    try {
      win.webContents.send('backend-status', backendState);
    } catch (err) {
      // Ignore closed window errors
    }
  });
}

function addBackendLog(log) {
  const cleanLog = log.toString().trim();
  if (!cleanLog) return;
  
  const lines = cleanLog.split(/\r?\n/);
  lines.forEach(line => {
    if (!line.trim()) return;
    backendState.logs.push(line.trim());
    if (backendState.logs.length > 500) {
      backendState.logs.shift();
    }
    
    BrowserWindow.getAllWindows().forEach(win => {
      try {
        win.webContents.send('backend-log', line.trim());
      } catch (err) {
        // Ignore closed window errors
      }
    });
  });
}

async function detectCudaWheelIndex() {
  // 1. Try to inspect environment variables first
  for (const key of Object.keys(process.env)) {
    const match = key.match(/^CUDA_PATH_V(\d+)_(\d+)/i);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      addBackendLog(`[CUDA Detection] Found CUDA version from environment: ${major}.${minor}`);
      if (major >= 12) {
        if (major > 12) {
          return 'cu124'; // Backward compatible CUDA 12.4 wheel for CUDA 13+
        }
        if (minor >= 1 && minor <= 6) {
          return `cu12${minor}`;
        }
        return 'cu121';
      } else if (major === 11) {
        return 'cu118';
      }
    }
  }

  // 2. Try to run nvidia-smi
  try {
    const { execSync } = require('child_process');
    let nvidiaSmiCmd = 'nvidia-smi';
    if (process.platform === 'win32') {
      const defaultPath = 'C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe';
      if (fs.existsSync(defaultPath)) {
        nvidiaSmiCmd = `"${defaultPath}"`;
      }
    }
    const output = execSync(nvidiaSmiCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = output.match(/CUDA\s+Version:\s+(\d+)\.(\d+)/i);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      addBackendLog(`[CUDA Detection] Found CUDA version from nvidia-smi: ${major}.${minor}`);
      if (major >= 12) {
        if (major > 12) {
          return 'cu124'; // Backward compatible CUDA 12.4 wheel for CUDA 13+
        }
        if (minor >= 1 && minor <= 6) {
          return `cu12${minor}`;
        }
        return 'cu121';
      } else if (major === 11) {
        return 'cu118';
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

async function startPythonBackend() {
  const isProd = app.isPackaged;
  const backendExecutable = path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'desktop-ai-backend.exe' : 'desktop-ai-backend');

  console.log(`[Main] Starting Python Backend. Production Mode: ${isProd}`);

  if (pyProcess) {
    try {
      pyProcess.kill();
    } catch (e) {}
    pyProcess = null;
  }

  try {
    if (isProd && fs.existsSync(backendExecutable)) {
      updateBackendStatus('starting');
      addBackendLog('Launching packaged production AI server...');

      pyProcess = spawn(backendExecutable, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, HF_HUB_ENABLE_HF_TRANSFER: "1" }
      });

      if (pyProcess) {
        console.log(`[Main] Production Python process spawned successfully (PID: ${pyProcess.pid})`);
        
        pyProcess.stdout.on('data', (data) => addBackendLog(data.toString()));
        pyProcess.stderr.on('data', (data) => addBackendLog(data.toString()));

        pyProcess.on('error', (err) => {
          console.error('[Main] Failed to spawn Python backend process:', err);
          updateBackendStatus('error', `Failed to start packaged backend: ${err.message}`);
        });

        pyProcess.on('close', (code) => {
          if (code !== 0 && backendState.status === 'starting') {
            updateBackendStatus('error', `Backend exited prematurely with code ${code}`);
          }
        });
        
        updateBackendStatus('running');
      }
    } else {
      const backendDir = isProd 
        ? path.join(process.resourcesPath, 'backend')
        : path.join(__dirname, 'backend');
      const backendScript = path.join(backendDir, 'main.py');
      const requirementsPath = path.join(backendDir, 'requirements.txt');

      if (isProd) {
        addBackendLog('Pre-compiled binary not found. Falling back to live Python execution...');
        addBackendLog(`Checking script path: ${backendScript}`);
      }

      updateBackendStatus('checking-python');
      addBackendLog('Verifying local Python 3 installation...');

      const commands = ['python3', 'python', 'py'];
      let pythonCmd = null;

      for (const cmd of commands) {
        try {
          const test = spawn(cmd, ['--version']);
          const success = await new Promise((resolve) => {
            test.on('spawn', () => {
              test.kill();
              resolve(true);
            });
            test.on('error', () => {
              resolve(false);
            });
          });

          if (success) {
            pythonCmd = cmd;
            break;
          }
        } catch (e) {
          // Ignore and continue
        }
      }

      if (!pythonCmd) {
        updateBackendStatus('missing-python', 'Python 3 could not be found in PATH.');
        addBackendLog('ERROR: Python 3 could not be found. Please download and install Python 3 (https://www.python.org/downloads/) and make sure to select "Add Python to PATH" during installation.');
        return;
      }

      addBackendLog(`Found working Python interpreter: ${pythonCmd}`);
      updateBackendStatus('checking-dependencies');
      addBackendLog('Checking for missing Python libraries...');

      const checkScript = 'import fastapi, uvicorn, pydantic, llama_cpp, faster_whisper, huggingface_hub';
      const checkProc = spawn(pythonCmd, ['-c', checkScript]);

      let hasDeps = await new Promise((resolve) => {
        checkProc.on('close', (code) => {
          resolve(code === 0);
        });
        checkProc.on('error', () => {
          resolve(false);
        });
      });

      // If they have all packages, check if we need to upgrade them to GPU-enabled llama-cpp-python
      if (hasDeps) {
        let cudaWheelIndex = null;
        try {
          cudaWheelIndex = await detectCudaWheelIndex();
        } catch (err) {}

        if (cudaWheelIndex) {
          // Check if current llama_cpp supports GPU offload
          const gpuCheckProc = spawn(pythonCmd, ['-c', 'from llama_cpp import llama_supports_gpu_offload; exit(0 if llama_supports_gpu_offload() else 1)']);
          const supportsGpu = await new Promise((resolve) => {
            gpuCheckProc.on('close', (code) => {
              resolve(code === 0);
            });
            gpuCheckProc.on('error', () => {
              resolve(false);
            });
          });

          if (!supportsGpu) {
            addBackendLog('[GPU Auto-Optimization] CUDA GPU detected, but the currently installed llama-cpp-python lacks CUDA acceleration. Triggering re-installation for GPU acceleration...');
            hasDeps = false;
          }
        }
      }

      if (!hasDeps) {
        addBackendLog('Missing required offline AI libraries. Starting automatic installation...');
        updateBackendStatus('installing-dependencies');

        // To ensure any corrupted/compiled previous packages don't interfere, perform a clean uninstall first
        addBackendLog('[Cleanup] Removing any potentially corrupted previous installations of llama-cpp-python...');
        try {
          const uninstallProc = spawn(pythonCmd, ['-m', 'pip', 'uninstall', '-y', 'llama-cpp-python']);
          await new Promise((resolve) => {
            uninstallProc.on('close', resolve);
            uninstallProc.on('error', () => resolve(true));
          });
          addBackendLog('[Cleanup] Cleaned old/broken llama-cpp-python installations successfully.');
        } catch (err) {
          addBackendLog(`[Cleanup Warning] Could not uninstall previous llama-cpp-python: ${err.message}`);
        }

        // Check if CUDA is available so we can install precompiled GPU acceleration wheels
        let cudaWheelIndex = null;
        try {
          cudaWheelIndex = await detectCudaWheelIndex();
        } catch (err) {
          addBackendLog(`CUDA detection error: ${err.message}`);
        }

        if (cudaWheelIndex) {
          addBackendLog(`[GPU Auto-Optimization] CUDA GPU detected! Pre-installing CUDA-accelerated llama-cpp-python (${cudaWheelIndex}) for native offline GGUF acceleration...`);
          addBackendLog(`Running: ${pythonCmd} -m pip install --no-cache-dir --user --prefer-binary --only-binary llama-cpp-python --upgrade --force-reinstall llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/${cudaWheelIndex}`);

          const cudaPipProc = spawn(pythonCmd, [
            '-m', 'pip', 'install', 
            '--no-cache-dir', 
            '--user', 
            '--prefer-binary',
            '--only-binary', 'llama-cpp-python',
            '--upgrade',
            '--force-reinstall',
            'llama-cpp-python>=0.2.75', 
            '--extra-index-url', `https://abetlen.github.io/llama-cpp-python/whl/${cudaWheelIndex}`
          ], {
            env: { ...process.env, HF_HUB_ENABLE_HF_TRANSFER: "1" }
          });

          cudaPipProc.stdout.on('data', (data) => addBackendLog(`[GPU Install] ${data.toString()}`));
          cudaPipProc.stderr.on('data', (data) => addBackendLog(`[GPU Install] ${data.toString()}`));

          const cudaSuccess = await new Promise((resolve) => {
            cudaPipProc.on('close', (code) => {
              resolve(code === 0);
            });
            cudaPipProc.on('error', (err) => {
              addBackendLog(`[GPU Install] Error: ${err.message}`);
              resolve(false);
            });
          });

          if (cudaSuccess) {
            addBackendLog('[GPU Auto-Optimization] CUDA-accelerated GGUF engine installed successfully!');
          } else {
            addBackendLog('[GPU Auto-Optimization] CUDA wheel installation failed or not found. Falling back to standard installation.');
          }
        } else {
          addBackendLog('[GPU Auto-Optimization] No CUDA GPU environment or matching drivers detected. Proceeding with standard CPU/Fallback installation.');
        }

        addBackendLog(`Running: ${pythonCmd} -m pip install --no-cache-dir --user --prefer-binary --only-binary llama-cpp-python --upgrade --force-reinstall -r ${requirementsPath} --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu`);

        const pipProc = spawn(pythonCmd, [
          '-m', 'pip', 'install', 
          '--no-cache-dir', 
          '--user', 
          '--prefer-binary',
          '--only-binary', 'llama-cpp-python',
          '--upgrade',
          '--force-reinstall',
          '-r', requirementsPath,
          '--extra-index-url', 'https://abetlen.github.io/llama-cpp-python/whl/cpu'
        ], {
          env: { ...process.env, HF_HUB_ENABLE_HF_TRANSFER: "1" }
        });

        pipProc.stdout.on('data', (data) => addBackendLog(data.toString()));
        pipProc.stderr.on('data', (data) => addBackendLog(data.toString()));

        const installSuccess = await new Promise((resolve) => {
          pipProc.on('close', (code) => {
            resolve(code === 0);
          });
          pipProc.on('error', (err) => {
            addBackendLog(`Installation error: ${err.message}`);
            resolve(false);
          });
        });

        if (!installSuccess) {
          updateBackendStatus('error', 'Failed to install Python dependencies. Please check the logs.');
          return;
        }

        addBackendLog('Dependencies installed successfully!');
      } else {
        addBackendLog('All offline AI dependencies are already installed!');
      }

      updateBackendStatus('starting');
      addBackendLog('Starting FastAPI backend server...');

      const proc = spawn(pythonCmd, [backendScript], {
        env: { ...process.env, HF_HUB_ENABLE_HF_TRANSFER: "1" }
      });

      proc.stdout.on('data', (data) => addBackendLog(data.toString()));
      proc.stderr.on('data', (data) => addBackendLog(data.toString()));

      proc.on('error', (err) => {
        updateBackendStatus('error', `Failed to start live Python script: ${err.message}`);
      });

      proc.on('close', (code) => {
        if (code !== 0 && backendState.status === 'starting') {
          updateBackendStatus('error', `Backend exited with code ${code}`);
        }
      });

      pyProcess = proc;
      updateBackendStatus('running');
      addBackendLog('Local FastAPI backend server is running successfully!');
    }
  } catch (err) {
    console.error('[Main] Exception while starting Python process:', err);
    updateBackendStatus('error', err.message || 'Unknown backend launch error');
  }
}

function createWindow() {
  // Start python backend server asynchronously in background
  startPythonBackend();

  const iconPath = app.isPackaged
    ? path.join(__dirname, 'dist', 'icon.png')
    : path.join(__dirname, 'public', 'icon.png');

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Course Nexus Desktop',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Re-enable web security
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  mainWindow.loadURL('app://-/index.html');
  
  // Forward console logs to terminal
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    let requestUrl = request.url.replace('app://-', '');
    // Remove query parameters or hashes
    requestUrl = requestUrl.split('?')[0].split('#')[0];
    
    // Support serving absolute local files via a special prefix
    if (requestUrl.startsWith('/local-file/')) {
      const localPath = decodeURIComponent(requestUrl.replace('/local-file/', ''));
      return net.fetch(url.pathToFileURL(localPath).toString());
    }

    // Default to index.html for root or directories
    if (requestUrl === '/' || requestUrl === '') {
      requestUrl = '/index.html';
    }
    
    // Normalize path to prevent directory traversal
    const normalizedPath = path.normalize(requestUrl);
    const absolutePath = path.join(__dirname, 'dist', normalizedPath);
    
    const fileUrl = url.pathToFileURL(absolutePath).toString();
    
    return net.fetch(fileUrl).catch(() => {
      // Fallback to index.html for SPA routing
      return net.fetch(url.pathToFileURL(path.join(__dirname, 'dist', 'index.html')).toString());
    });
  });

  // Handle IPC calls for managing the backend
  ipcMain.handle('get-backend-status', () => {
    return backendState;
  });

  ipcMain.on('trigger-setup', () => {
    console.log('[Main] IPC Trigger Setup received. Starting backend...');
    startPythonBackend();
  });

  ipcMain.on('open-external', (event, externalUrl) => {
    shell.openExternal(externalUrl);
  });

  createWindow();
});

// Ensure clean child process cleanup when Electron exits
app.on('will-quit', () => {
  if (pyProcess) {
    console.log('[Main] Killing child Python process...');
    pyProcess.kill();
    pyProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
