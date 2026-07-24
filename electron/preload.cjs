const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  chooseLibraryRoot: () => ipcRenderer.invoke('config:chooseLibraryRoot'),
  getTree: () => ipcRenderer.invoke('tree:get'),
  listFiles: (relPath) => ipcRenderer.invoke('files:list', relPath),
  readFile: (relPath) => ipcRenderer.invoke('file:read', relPath),
  renameFile: (relPath, newName) => ipcRenderer.invoke('file:rename', relPath, newName),
  moveFile: (relPath, destDirRelPath) => ipcRenderer.invoke('file:move', relPath, destDirRelPath),
  createCategory: (parentRelPath, name) => ipcRenderer.invoke('category:create', parentRelPath, name),
  deleteCategory: (relPath) => ipcRenderer.invoke('category:delete', relPath),
  revealFile: (relPath) => ipcRenderer.invoke('file:reveal', relPath),
  deleteFile: (relPath) => ipcRenderer.invoke('file:delete', relPath),
  restoreFile: (trashName, originalRelPath) => ipcRenderer.invoke('file:restore', trashName, originalRelPath),
  importFiles: (destDirRelPath) => ipcRenderer.invoke('file:import', destDirRelPath),
  getNotes: () => ipcRenderer.invoke('notes:get'),
  setNote: (relPath, text) => ipcRenderer.invoke('notes:set', relPath, text),
  onLibraryChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('library:changed', listener);
    return () => ipcRenderer.removeListener('library:changed', listener);
  },
});
