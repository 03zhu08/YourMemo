import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import * as path from 'path';
import { startPython, stopPython } from './pythonManager';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let captureWindow: BrowserWindow | null = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

function toggleQuickCapture() {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.close();
    captureWindow = null;
    return;
  }

  captureWindow = new BrowserWindow({
    width: 500,
    height: 140,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    captureWindow.loadURL('http://localhost:5173/#/capture');
  } else {
    captureWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'), { hash: '/capture' });
  }

  captureWindow.on('blur', () => {
    captureWindow?.close();
    captureWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startPython();
  } catch (e) {
    console.error('Failed to start backend:', e);
  }

  createMainWindow();
  globalShortcut.register('CommandOrControl+Shift+M', toggleQuickCapture);

  ipcMain.handle('open-external', (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopPython();
});
