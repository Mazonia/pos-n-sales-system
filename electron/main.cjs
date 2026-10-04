const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Akwaaba POS & Retail OS',
    backgroundColor: '#090B0E',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
    show: false,
  });

  // Smooth appearance once loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Load URL
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000/pos-n-sales-system/').catch(() => {
      // Fallback if localhost:3000 root
      mainWindow.loadURL('http://localhost:3000/');
    });
  } else {
    // In production, load the built dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  // Open target="_blank" links securely in default external browser (Strict HTTPS/HTTP protocol validation)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      } else {
        console.warn('[Security Pentest] Blocked unauthorized protocol open attempt:', url);
      }
    } catch (e) {
      console.warn('[Security Pentest] Blocked malformed URL:', url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// POS Application Native Menu
function setupApplicationMenu() {
  const template = [
    {
      label: 'Akwaaba POS',
      submenu: [
        {
          label: 'About Akwaaba POS & Retail OS',
          click: () => {
            shell.openExternal('https://github.com/Mazonia/pos-n-sales-system');
          },
        },
        { type: 'separator' },
        {
          label: 'Toggle POS Kiosk Mode (Lock Till)',
          accelerator: 'F11',
          click: () => toggleKioskMode(),
        },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit Application' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'Ctrl+R' },
        { role: 'forceReload', accelerator: 'Ctrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'Ctrl+Shift+I' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function toggleKioskMode() {
  if (!mainWindow) return false;
  const currentKiosk = mainWindow.isKiosk();
  mainWindow.setKiosk(!currentKiosk);
  return !currentKiosk;
}

// IPC Handlers
ipcMain.handle('pos:toggle-kiosk', () => {
  return toggleKioskMode();
});

ipcMain.handle('pos:is-kiosk', () => {
  return mainWindow ? mainWindow.isKiosk() : false;
});

// Thermal receipt printing via native Electron print driver
ipcMain.handle('pos:print-receipt', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: options.silent ?? false,
        printBackground: true,
        deviceName: options.printerName || '',
        margins: {
          marginType: 'none',
        },
        pageSize: {
          width: 80000, // 80mm standard POS roll width in microns
          height: 297000,
        },
      },
      (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle('system:get-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    appName: app.getName(),
    appVersion: app.getVersion(),
  };
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// App Lifecycle
app.whenReady().then(() => {
  setupApplicationMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
