const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onBackendStatus: (callback) => {
    // Remove previous listener to avoid memory leaks/duplicate calls
    ipcRenderer.removeAllListeners('backend-status');
    ipcRenderer.on('backend-status', (event, value) => callback(value));
  },
  onBackendLog: (callback) => {
    ipcRenderer.on('backend-log', (event, value) => callback(value));
  },
  triggerSetup: () => ipcRenderer.send('trigger-setup'),
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
