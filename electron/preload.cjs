const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose safe, isolated Electron API to renderer (React)
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  appVersion: process.env.npm_package_version || '1.0.0',
  
  // Hardware printing for POS thermal printers (80mm / 58mm)
  printReceipt: (options = {}) => ipcRenderer.invoke('pos:print-receipt', options),
  
  // Kiosk / Fullscreen toggle for POS tills
  toggleKiosk: () => ipcRenderer.invoke('pos:toggle-kiosk'),
  isKiosk: () => ipcRenderer.invoke('pos:is-kiosk'),
  
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  
  // External browser link handling
  openExternal: (url) => shell.openExternal(url),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),
});
