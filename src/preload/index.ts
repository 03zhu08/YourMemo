import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  onQuickCapture: (callback: () => void) => {
    ipcRenderer.on('quick-capture', () => callback());
  },
  openExternal: (url: string) => {
    ipcRenderer.invoke('open-external', url);
  },
});
