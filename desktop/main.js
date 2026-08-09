console.log('main.js starting...');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
console.log('Electron imported, app =', typeof app);
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Allow files loaded from updates directory (userData) to resolve bundled dependencies
const bundledNodeModules = path.join(__dirname, 'node_modules');
process.env.NODE_PATH = bundledNodeModules + (process.platform === 'win32' ? ';' : ':') + (process.env.NODE_PATH || '');
Module._initPaths();

process.env.PORT = '5005';

let userDataPath;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Zaiqah POS',
    backgroundColor: '#0f172a'
  });

  const userDataPath = app.getPath('userData');
  const updateIndexPath = path.join(userDataPath, 'updates/web-dist/index.html');
  const bundledIndexPath = path.join(__dirname, 'web-dist/index.html');
  
  if (fs.existsSync(updateIndexPath)) {
    console.log('Loading updated web UI from:', updateIndexPath);
    mainWindow.loadFile(updateIndexPath);
  } else if (fs.existsSync(bundledIndexPath)) {
    console.log('Loading bundled web UI from:', bundledIndexPath);
    mainWindow.loadFile(bundledIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.webContents.openDevTools();
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Clear cache to ensure OTA UI updates are immediately visible
  mainWindow.webContents.session.clearCache().then(() => {
    console.log('Electron session cache cleared successfully.');
  });
}

console.log('About to call app.whenReady()...');

// Single instance lock to prevent ghost processes from blocking
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting this one.');
  app.quit();
  return;
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  console.log('App ready!');
  userDataPath = app.getPath('userData');
  process.env.ELECTRON_USER_DATA_PATH = userDataPath;
  process.env.ELECTRON_APP_PATH = app.getAppPath();
  console.log('UserData directory:', userDataPath);
  
  try {
    const updateServerPath = path.join(userDataPath, 'updates/server/index.js');
    if (fs.existsSync(updateServerPath)) {
      console.log('Loading updated server from:', updateServerPath);
      require(updateServerPath);
    } else {
      console.log('Loading bundled server from:', path.join(__dirname, 'server/index.js'));
      require('./server/index.js');
    }
  } catch (error) {
    console.error('CRITICAL ERROR loading server. Falling back to bundled server if possible.', error);
    try {
      require('./server/index.js');
    } catch (e) {
      console.error('Bundled server also failed!', e);
    }
  }
  
  
  // ── Printing IPC ────────────────────────────────────────────────────────────
  // List connected printers for the settings page.
  ipcMain.handle('get-printers', async () => {
    try {
      const wc = mainWindow && mainWindow.webContents;
      if (!wc) return [];
      // getPrintersAsync is available in newer Electron; fall back to sync.
      const printers = wc.getPrintersAsync
        ? await wc.getPrintersAsync()
        : wc.getPrinters();
      return (printers || []).map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: !!p.isDefault,
      }));
    } catch (err) {
      console.error('get-printers failed:', err);
      return [];
    }
  });

  // Silently print raw HTML to a specific printer, with no dialog.
  // Renders the HTML in a hidden offscreen window, prints, then closes it.
  ipcMain.handle('silent-print', async (event, opts = {}) => {
    const { html, deviceName, copies = 1 } = opts;
    if (!html) return { ok: false, error: 'No HTML to print' };

    return new Promise((resolve) => {
      let printWin = new BrowserWindow({
        show: false,
        webPreferences: { offscreen: false, sandbox: true },
      });

      const cleanup = () => {
        if (printWin && !printWin.isDestroyed()) printWin.close();
        printWin = null;
      };

      printWin.webContents.once('did-finish-load', () => {
        const printOptions = {
          silent: true,
          printBackground: true,
          copies: Math.max(1, Number(copies) || 1),
        };
        if (deviceName) printOptions.deviceName = deviceName;

        printWin.webContents.print(printOptions, (success, failureReason) => {
          cleanup();
          resolve({ ok: success, error: success ? null : failureReason });
        });
      });

      printWin.webContents.once('did-fail-load', (e, code, desc) => {
        cleanup();
        resolve({ ok: false, error: `Load failed: ${desc}` });
      });

      // Load the HTML directly as a data URL.
      printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
