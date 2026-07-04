const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Allow loading local file:// URLs even from localhost
    }
  });

  // Check if we are running in development mode
  const isDev = process.env.ELECTRON_DEV === '1';
  
  if (isDev) {
    // Load the Vite dev server URL
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // Load the built HTML file in production
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
