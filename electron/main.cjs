const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

let mainWindow = null;
let overlayWindow = null;

const isDev = !app.isPackaged;
const devUrl = 'http://127.0.0.1:5173';

function rendererUrl(query = '') {
  if (isDev) {
    return `${devUrl}${query}`;
  }

  const filePath = path.join(__dirname, '..', 'dist', 'index.html');
  return `file://${filePath}${query}`;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    title: 'Mishoo',
    backgroundColor: '#fff8ef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(rendererUrl());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showBreakOverlay({ durationSec, pet, strictMode, language }) {
  const safeDuration = Math.max(10, Math.min(Number(durationSec) || 300, 60 * 60));
  const safePet = encodeURIComponent(String(pet || 'mishoo-cat'));
  const strict = strictMode === false ? '0' : '1';
  const lang = encodeURIComponent(String(language || 'zh'));

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.bounds;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    title: 'Mishoo Break',
    backgroundColor: '#fff3dc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadURL(rendererUrl(`?mode=break&duration=${safeDuration}&pet=${safePet}&strict=${strict}&lang=${lang}`));
  overlayWindow.focus();

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  });
}

function closeBreakOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
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

ipcMain.handle('break:show', (_event, payload) => {
  showBreakOverlay(payload || {});
});

ipcMain.handle('break:close', () => {
  closeBreakOverlay();
});

ipcMain.handle('app:version', () => app.getVersion());
