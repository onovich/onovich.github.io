const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listSections:   ()               => ipcRenderer.invoke('content:list'),
  readSection:    (section)        => ipcRenderer.invoke('content:read', section),
  writeSection:   (section, data)  => ipcRenderer.invoke('content:write', section, data),
  importImages:   (section)        => ipcRenderer.invoke('image:import', section),
  startPreview:   ()               => ipcRenderer.invoke('preview:start'),
  publish:        (message)        => ipcRenderer.invoke('publish', message),
});
