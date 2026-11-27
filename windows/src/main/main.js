'use strict';
const path = require('path');
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, desktopCapturer, session, shell, nativeImage, nativeTheme } = require('electron');
const { setAppData } = require('./models');
setAppData(app.getPath('appData'));
const { AppState, CORE, DEV, CHANGES, NOTES } = require('./appstate');
const { icon } = require('./tray-icons');

const BG = '#07072a'; // royal-night, oklch(0.16 0.069 275.2)

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

app.setAppUserModelId('local.meetcoder.app');
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null;
let tray = null;
let quitting = false;
let captureTarget = null;
let rpcSeq = 0;
const pendingRpc = new Map();

function rpc(channel, payload, timeoutMs = 60000) {
  return new Promise(resolve => {
    if (!win || win.isDestroyed()) { resolve(null); return; }
    const id = ++rpcSeq;
    pendingRpc.set(id, resolve);
    win.webContents.send('rpc', { id, channel, payload });
    setTimeout(() => { if (pendingRpc.delete(id)) resolve(null); }, timeoutMs);
  });
}
ipcMain.on('rpc-reply', (_e, { id, result }) => {
  const r = pendingRpc.get(id);
  if (r) { pendingRpc.delete(id); r(result); }
});

const state = new AppState({
  rpc: (channel, payload) => {
    if (channel === 'capture:start') captureTarget = payload.id;
    return rpc(channel, payload, channel === 'snapshot' ? 30000 : 60000);
  },
  async listWindows() {
    const srcs = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false });
    return srcs.map(s => ({ id: s.id, name: s.name }));
  },
  ownSourceIds() { return BrowserWindow.getAllWindows().map(w => { try { return w.getMediaSourceId(); } catch { return ''; } }); },
  notify(title, body) { try { if (Notification.isSupported()) new Notification({ title, body }).show(); } catch {} },
  nativeImage,
});

// ---- publishing state to the renderer ----

const dirtyGroups = new Set();
let flushTimer = null;
state.on('dirty', group => {
  dirtyGroups.add(group);
  if (!flushTimer) flushTimer = setTimeout(flush, 40);
});
let trayKey = '';
function flush() {
  flushTimer = null;
  const groups = [...dirtyGroups];
  dirtyGroups.clear();
  for (const g of groups) if (win && !win.isDestroyed()) win.webContents.send('state', g, state.snapshot(g));
  if (groups.includes(CORE)) updateTray();
}

// ---- window ----

function createWindow() {
  win = new BrowserWindow({
    width: 1380, height: 860, useContentSize: true, minWidth: 1120, minHeight: 700,
    title: 'MeetCoder', backgroundColor: BG, icon: path.join(__dirname, '..', '..', 'build', 'icon.png'), show: false, autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: BG, symbolColor: '#d9dbf2', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webviewTag: true, backgroundThrottling: false,
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  win.once('ready-to-show', () => win.show());
  // Closing the window keeps the app (and the capture) running in the tray.
  win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

function showDashboard() {
  if (!win || win.isDestroyed()) createWindow();
  else { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
}

function setCompact(c, resize) {
  if (!win) return;
  win.setMinimumSize(c ? 520 : 1120, c ? 560 : 700);
  if (resize) {
    win.setAlwaysOnTop(c, 'floating');
    const b = win.getContentBounds();
    const [w, h] = c ? [540, 620] : [1380, 860]; // wider than macOS (420): the Windows caption buttons take more room than the traffic-light gap
    win.setContentBounds({ x: b.x, y: b.y, width: w, height: h });
  }
}

// ---- tray (the macOS menu-bar extra) ----

function updateTray() {
  if (!tray) return;
  const name = state.agent.active ? 'hammer.circle.fill' : (state.running ? 'record.circle.fill' : 'record.circle');
  const key = [name, state.current && state.current.name, state.agent.active && state.agent.step, state.running, nativeTheme.shouldUseDarkColors].join('|');
  if (key === trayKey) return;
  trayKey = key;
  tray.setImage(icon(name, nativeTheme.shouldUseDarkColors));
  const items = [
    { label: state.running ? 'Figyelés leállítása' : 'Figyelés indítása', click: () => { state.running ? state.stop() : state.start(); } },
    { label: 'Irányítópult megnyitása', click: showDashboard },
    { type: 'separator' },
  ];
  if (state.current) items.push({ label: `Projekt: ${state.current.name}`, enabled: false });
  if (state.agent.active) items.push({ label: state.agent.step, enabled: false });
  items.push({ type: 'separator' }, { label: 'Kilépés', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() });
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

// ---- IPC ----

ipcMain.handle('init', () => ({
  home: require('os').homedir(),
  core: state.snapshot(CORE), dev: state.snapshot(DEV), changes: state.snapshot(CHANGES), notes: state.snapshot(NOTES),
}));

const actions = {
  start: () => state.start(),
  stop: () => state.stop(),
  switchWindow: id => state.switchWindow(id),
  refreshWindows: () => state.refreshWindows(),
  setCurrent: p => state.setCurrentByPath(p),
  rescan: () => state.rescan(),
  bootstrap: () => state.bootstrap(),
  grab: () => state.grab(),
  analyseNow: () => state.analyseNow(),
  stopAgent: () => state.stopAgent(),
  runQueued: () => state.runQueued(),
  submitManual: t => state.submitManual(String(t || '')),
  undo: id => state.undo(id),
  setSettings: patch => state.updateSettings(patch),
  refreshModels: () => state.models.refresh(),
  devToggle: () => { if (state.dev.running) state.dev.stop(); else if (state.current) state.dev.start(state.current); },
  setCompact: (c, resize) => setCompact(!!c, !!resize),
  revealNotes: () => { if (state.notesFile) shell.showItemInFolder(state.notesFile); },
};
ipcMain.handle('act', async (_e, name, args) => {
  const f = actions[name];
  if (f) await f(...(args || []));
});
ipcMain.on('notify', (_e, name, data) => {
  if (name === 'capture-ended') state.captureEnded(String((data && data.message) || ''));
});

// ---- lifecycle ----

app.whenReady().then(() => {
  session.defaultSession.setDisplayMediaRequestHandler((_req, callback) => {
    desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 } }).then(srcs => {
      const s = srcs.find(x => x.id === captureTarget);
      if (s) callback({ video: s }); else callback({});
    }).catch(() => callback({}));
  }, { useSystemPicker: false });
  tray = new Tray(icon('record.circle', nativeTheme.shouldUseDarkColors));
  tray.setToolTip('MeetCoder');
  tray.on('click', () => tray.popUpContextMenu());
  nativeTheme.on('updated', () => { trayKey = ''; updateTray(); });
  createWindow();
  updateTray();
  state.bootstrap();
  state.models.refresh();
});
app.on('second-instance', showDashboard);
app.on('activate', showDashboard);
app.on('before-quit', () => { quitting = true; state.shutdown(); });
app.on('window-all-closed', () => { /* stay alive in the tray */ });
