const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mishoo', {
  showBreakOverlay: (payload) => ipcRenderer.invoke('break:show', payload),
  closeBreakOverlay: () => ipcRenderer.invoke('break:close'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  beginPetDrag: (point) => ipcRenderer.invoke('pet:drag-start', point),
  movePet: (point) => ipcRenderer.invoke('pet:drag-move', point),
  endPetDrag: () => ipcRenderer.invoke('pet:drag-end'),
  resizePet: (delta) => ipcRenderer.invoke('pet:resize', delta),
  showPetMenu: (state) => ipcRenderer.invoke('pet:menu', state),
  onPetTimerToggle: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('pet:timer-toggle', handler);
    return () => ipcRenderer.removeListener('pet:timer-toggle', handler);
  },
  onPetShowTodos: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('pet:show-todos', handler);
    return () => ipcRenderer.removeListener('pet:show-todos', handler);
  },
  onPetPatrolState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('pet:patrol-state', handler);
    return () => ipcRenderer.removeListener('pet:patrol-state', handler);
  },
  setPetPatrolPaused: (paused) => ipcRenderer.invoke('pet:patrol-paused', paused),
});
