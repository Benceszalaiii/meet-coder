'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

let appDataDir = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
/** Overridable for tests / non-Electron use. */
function setAppData(dir) { appDataDir = dir; delete Paths._c; }

const Paths = {
  get support() { return this._dir('MeetCoder'); },
  get frames() { return this._dir('MeetCoder', 'frames'); },
  get shadow() { return this._dir('MeetCoder', 'shadow'); },
  _dir(...parts) {
    const p = path.join(appDataDir, ...parts);
    try { fs.mkdirSync(p, { recursive: true }); } catch {}
    return p;
  },
  expand(p) {
    if (p === '~') return os.homedir();
    if (p.startsWith('~/') || p.startsWith('~\\')) return path.join(os.homedir(), p.slice(2));
    return p;
  },
};

const DEFAULT_SETTINGS = {
  model: 'auto',
  tPath: 'T:\\',
  groups: [],
  projectsRoot: '~/school/projects',
  autoRun: true,
  autoGrab: true,
  intervalSec: 45,
  costCap: 5,
  teacherFolders: {}, // presenter name -> folder on T:
};

const Settings = {
  file() { return path.join(Paths.support, 'settings.json'); },
  load() {
    try {
      const d = JSON.parse(fs.readFileSync(Settings.file(), 'utf8'));
      return { ...DEFAULT_SETTINGS, ...d, teacherFolders: { ...(d.teacherFolders || {}) } };
    } catch { return { ...DEFAULT_SETTINGS, teacherFolders: {} }; }
  },
  save(s) { try { fs.writeFileSync(Settings.file(), JSON.stringify(s)); } catch {} },
  root(s) { return path.normalize(Paths.expand(s.projectsRoot)); },
};

const STACK_NAMES = { next: 'Next.js', node: 'Express / Node', laravel: 'Laravel', csharp: 'C#' };

function stacks(p) { return [...new Set(p.services.map(s => s.kind))].sort(); }
function hasCSharp(p) { return stacks(p).includes('csharp'); }
function stackLabel(p) {
  const s = stacks(p);
  return s.length === 0 ? 'unknown stack' : s.map(k => STACK_NAMES[k] || k).join(' + ');
}
function newProject(name, p) {
  return { name, path: p, services: [], teacher: null, group: null, lastActive: null, topFiles: [] };
}

/** Diacritic- and case-insensitive form, for matching names. */
function folded(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().normalize('NFC'); }
function tail(s, n) { const a = Array.from(s); return a.length > n ? a.slice(a.length - n).join('') : s; }
function head(s, n) { const a = Array.from(s); return a.length > n ? a.slice(0, n).join('') : s; }

module.exports = { Paths, Settings, DEFAULT_SETTINGS, setAppData, stacks, hasCSharp, stackLabel, newProject, folded, tail, head };
