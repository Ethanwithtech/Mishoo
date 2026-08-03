const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let mainWindow = null;
let overlayWindow = null;
let petWindow = null;
let petScale = 1;
let petAlwaysOnTop = true;
let petDrag = null;
let petPatrolTimer = null;
let petPatrolPaused = true;
let petMenuOpen = false;
let petPatrolState = {
  direction: -1,
  mode: 'walking',
  nextChangeAt: Date.now() + 9000,
  lastTickAt: Date.now(),
};

const PET_BASE_WIDTH = 360;
const PET_BASE_HEIGHT = 440;
const PET_PATROL_SPEED = 52;

function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function sendPetPatrolState() {
  if (!petWindow || petWindow.isDestroyed() || petWindow.webContents.isLoading()) return;
  petWindow.webContents.send('pet:patrol-state', {
    direction: petPatrolState.direction,
    mode: petPatrolState.mode,
  });
}

function setPetPatrolMode(mode, now = Date.now()) {
  petPatrolState.mode = mode;
  petPatrolState.nextChangeAt = mode === 'walking'
    ? now + randomBetween(7000, 12000)
    : now + randomBetween(2000, 4000);
  sendPetPatrolState();
}

function startPetPatrol() {
  if (petPatrolTimer) return;
  petPatrolState.lastTickAt = Date.now();
  setPetPatrolMode('walking');
  petPatrolTimer = setInterval(() => {
    const now = Date.now();
    const deltaSeconds = Math.min(0.2, (now - petPatrolState.lastTickAt) / 1000);
    petPatrolState.lastTickAt = now;
    if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible() || petDrag || petPatrolPaused || petMenuOpen) return;

    if (now >= petPatrolState.nextChangeAt) {
      setPetPatrolMode(petPatrolState.mode === 'walking' ? 'idle' : 'walking', now);
    }
    if (petPatrolState.mode !== 'walking') return;

    const bounds = petWindow.getBounds();
    const area = screen.getDisplayMatching(bounds).workArea;
    const minX = area.x;
    const maxX = area.x + area.width - bounds.width;
    let nextX = bounds.x + Math.round(PET_PATROL_SPEED * deltaSeconds) * petPatrolState.direction;
    let changedDirection = false;
    if (nextX <= minX) {
      nextX = minX;
      petPatrolState.direction = 1;
      changedDirection = true;
    } else if (nextX >= maxX) {
      nextX = maxX;
      petPatrolState.direction = -1;
      changedDirection = true;
    }
    petWindow.setPosition(nextX, bounds.y, false);
    if (changedDirection) sendPetPatrolState();
  }, 50);
}

const isDev = !app.isPackaged;
const devUrl = 'http://127.0.0.1:5173';

function rendererUrl(query = '') {
  if (isDev) {
    return `${devUrl}${query}`;
  }

  const filePath = path.join(__dirname, '..', 'dist', 'index.html');
  return `${pathToFileURL(filePath).toString()}${query}`;
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

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

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function petSize() {
  return {
    width: Math.round(PET_BASE_WIDTH * petScale),
    height: Math.round(PET_BASE_HEIGHT * petScale),
  };
}

function createPetWindow() {
  if (petWindow && !petWindow.isDestroyed()) return petWindow;

  const { width, height } = petSize();
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  petWindow = new BrowserWindow({
    x: area.x + area.width - width - 24,
    y: area.y + area.height - height - 18,
    width,
    height,
    minWidth: Math.round(PET_BASE_WIDTH * 0.6),
    minHeight: Math.round(PET_BASE_HEIGHT * 0.6),
    maxWidth: Math.round(PET_BASE_WIDTH * 2),
    maxHeight: Math.round(PET_BASE_HEIGHT * 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    hasShadow: false,
    title: 'Mishoo Desktop Pet',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadURL(rendererUrl('?mode=pet'));
  petWindow.webContents.on('did-finish-load', () => sendPetPatrolState());
  petWindow.on('closed', () => {
    petWindow = null;
  });
  startPetPatrol();
  return petWindow;
}

function resizePetWindow(nextScale) {
  if (!petWindow || petWindow.isDestroyed()) return petScale;
  const bounded = Math.max(0.6, Math.min(2, Math.round(nextScale * 10) / 10));
  const oldBounds = petWindow.getBounds();
  petScale = bounded;
  const next = petSize();
  const display = screen.getDisplayMatching(oldBounds);
  const area = display.workArea;
  const centeredX = Math.round(oldBounds.x + (oldBounds.width - next.width) / 2);
  const bottomY = oldBounds.y + oldBounds.height - next.height;
  const x = Math.max(area.x, Math.min(centeredX, area.x + area.width - next.width));
  const y = Math.max(area.y, Math.min(bottomY, area.y + area.height - next.height));
  petWindow.setBounds({ x, y, width: next.width, height: next.height }, true);
  return petScale;
}

function showPetMenu(state = {}) {
  if (!petWindow || petWindow.isDestroyed()) return;
  petMenuOpen = true;
  const phaseLabel = state.phase === 'work' ? 'focus' : state.phase === 'longBreak' ? 'long break' : 'break';
  const menu = Menu.buildFromTemplate([
    {
      label: state.running ? `Pause ${phaseLabel} timer & rest` : `Start ${phaseLabel} timer`,
      click: () => petWindow?.webContents.send('pet:timer-toggle'),
    },
    {
      label: 'Motion during focus',
      submenu: [
        {
          label: 'Calm rest (recommended)',
          type: 'radio',
          checked: state.activityMode !== 'patrol',
          click: () => petWindow?.webContents.send('pet:activity-mode', 'calm'),
        },
        {
          label: 'Gentle patrol',
          type: 'radio',
          checked: state.activityMode === 'patrol',
          click: () => petWindow?.webContents.send('pet:activity-mode', 'patrol'),
        },
      ],
    },
    { label: 'Settings', click: () => createMainWindow() },
    { label: 'To-do list', click: () => petWindow?.webContents.send('pet:show-todos') },
    { type: 'separator' },
    {
      label: 'Size',
      submenu: [0.8, 1, 1.25, 1.5].map((scale) => ({
        label: `${Math.round(scale * 100)}%`,
        type: 'radio',
        checked: Math.abs(petScale - scale) < 0.05,
        click: () => resizePetWindow(scale),
      })),
    },
    {
      label: 'Always on top',
      type: 'checkbox',
      checked: petAlwaysOnTop,
      click: (item) => {
        petAlwaysOnTop = item.checked;
        petWindow?.setAlwaysOnTop(item.checked, 'floating');
      },
    },
    { type: 'separator' },
    { label: 'Quit Mishoo', role: 'quit' },
  ]);
  menu.popup({ window: petWindow, callback: () => { petMenuOpen = false; } });
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
  petWindow?.hide();

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    petWindow?.showInactive();
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
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
  createPetWindow();

  app.on('activate', () => {
    if (!petWindow || petWindow.isDestroyed()) createPetWindow();
    else petWindow.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

ipcMain.handle('break:show', (_event, payload) => {
  showBreakOverlay(payload || {});
});

ipcMain.handle('break:close', () => {
  closeBreakOverlay();
});

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('pet:drag-start', (_event, point) => {
  if (!petWindow || petWindow.isDestroyed()) return;
  const [windowX, windowY] = petWindow.getPosition();
  petDrag = {
    pointerX: Number(point?.screenX) || 0,
    pointerY: Number(point?.screenY) || 0,
    windowX,
    windowY,
  };
});

ipcMain.handle('pet:drag-move', (_event, point) => {
  if (!petDrag || !petWindow || petWindow.isDestroyed()) return;
  const pointerX = Number(point?.screenX);
  const pointerY = Number(point?.screenY);
  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY) || Math.abs(pointerX) > 100000 || Math.abs(pointerY) > 100000) return;
  const displays = screen.getAllDisplays();
  const bounds = petWindow.getBounds();
  const minX = Math.min(...displays.map((display) => display.workArea.x));
  const minY = Math.min(...displays.map((display) => display.workArea.y));
  const maxX = Math.max(...displays.map((display) => display.workArea.x + display.workArea.width)) - bounds.width;
  const maxY = Math.max(...displays.map((display) => display.workArea.y + display.workArea.height)) - bounds.height;
  const x = Math.max(minX, Math.min(maxX, Math.round(petDrag.windowX + (pointerX - petDrag.pointerX))));
  const y = Math.max(minY, Math.min(maxY, Math.round(petDrag.windowY + (pointerY - petDrag.pointerY))));
  petWindow.setPosition(x, y, false);
});

ipcMain.handle('pet:drag-end', () => {
  petDrag = null;
  petPatrolState.lastTickAt = Date.now();
});

ipcMain.handle('pet:resize', (_event, delta) => resizePetWindow(petScale + Number(delta || 0)));
ipcMain.handle('pet:menu', (_event, state) => showPetMenu(state));
ipcMain.handle('pet:patrol-paused', (_event, paused) => {
  petPatrolPaused = Boolean(paused);
  petPatrolState.lastTickAt = Date.now();
});
