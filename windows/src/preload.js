'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  init: () => ipcRenderer.invoke('init'),
  act: (name, ...args) => ipcRenderer.invoke('act', name, args),
  onState: cb => { ipcRenderer.on('state', (_e, group, data) => cb(group, data)); },
  notify: (name, data) => ipcRenderer.send('notify', name, data),
  /** The main process asks the renderer to do capture work (the stream lives here). */
  onRequest: handler => {
    ipcRenderer.on('rpc', async (_e, { id, channel, payload }) => {
      let result;
      try { result = await handler(channel, payload); } catch (err) { result = { ok: false, error: String((err && err.message) || err) }; }
      ipcRenderer.send('rpc-reply', { id, result });
    });
  },
});
