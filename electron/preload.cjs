const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mishoo', {
  showBreakOverlay: (payload) => ipcRenderer.invoke('break:show', payload),
  closeBreakOverlay: () => ipcRenderer.invoke('break:close'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
});
