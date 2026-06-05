const { contextBridge, ipcRenderer } = require('electron');

const api = {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  bootstrap: () => ipcRenderer.invoke('app:bootstrap'),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (data) => ipcRenderer.invoke('settings:save', data),
    testApiKey: (provider, apiKey) =>
      ipcRenderer.invoke('settings:test-api-key', { provider, apiKey }),
    saveApiKey: (provider, apiKey) =>
      ipcRenderer.invoke('settings:save-api-key', { provider, apiKey }),
  },
  sessions: {
    loadAll: () => ipcRenderer.invoke('session:load-all'),
    load: (id) => ipcRenderer.invoke('session:load', id),
    create: (config) => ipcRenderer.invoke('session:create', config),
    save: (session) => ipcRenderer.invoke('session:save', session),
    delete: (id) => ipcRenderer.invoke('session:delete', id),
  },
  resumes: {
    loadAll: () => ipcRenderer.invoke('resume:load-all'),
    delete: (id) => ipcRenderer.invoke('resume:delete', id),
    uploadPdf: () => ipcRenderer.invoke('resume:upload-pdf'),
    saveManual: (data) => ipcRenderer.invoke('resume:save-manual', data),
  },
  documents: {
    loadAll: () => ipcRenderer.invoke('document:load-all'),
    save: (data) => ipcRenderer.invoke('document:save', data),
    delete: (id) => ipcRenderer.invoke('document:delete', id),
  },
  models: {
    available: () => ipcRenderer.invoke('models:available'),
  },
  window: {
    showOverlay: () => ipcRenderer.send('window:show-overlay'),
    hideOverlay: () => ipcRenderer.send('window:hide-overlay'),
    showDashboard: () => ipcRenderer.send('window:show-dashboard'),
    setOpacity: (o) => ipcRenderer.invoke('window:set-opacity', o),
    move: (dx, dy) => ipcRenderer.send('window:move', { dx, dy }),
    minimizeOverlay: () => ipcRenderer.send('overlay:minimize'),
    closeOverlay: () => ipcRenderer.send('overlay:close'),
  },
  audio: {
    start: () => ipcRenderer.send('audio:start'),
    stop: () => ipcRenderer.send('audio:stop'),
    sendPcmChunk: (arrayBuffer) =>
      ipcRenderer.send('audio:pcm-chunk', new Uint8Array(arrayBuffer)),
    sendLevel: (level) => ipcRenderer.send('audio:level-relay', { level }),
    sendStatus: (status) => ipcRenderer.send('audio:status-relay', status),
  },
  ai: {
    trigger: (payload) => ipcRenderer.send('ai:trigger', payload),
    regenerate: (payload) => ipcRenderer.send('ai:regenerate', payload),
    quickTest: (payload) => ipcRenderer.invoke('ai:quick-test', payload),
  },
};

contextBridge.exposeInMainWorld('stealthAPI', api);
