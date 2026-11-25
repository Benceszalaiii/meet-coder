'use strict';
const fs = require('fs');
const path = require('path');
const { Paths, newProject, head } = require('./models');
const Shell = require('./shell');

const heavy = new Set(['node_modules', 'vendor', '.next', 'obj', 'dist', 'build', '.git', '.vs', '.idea', 'storage', '.meetcoder', 'notes']);

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function list(p) { try { return fs.readdirSync(p); } catch { return []; } }

function dirs(p) {
  return list(p).filter(n => !n.startsWith('.') && isDir(path.join(p, n))).sort(cmp);
}
function files(p) { return list(p).filter(n => !n.startsWith('.')).sort(cmp); }
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function kind(dir) {
  const names = list(dir);
  if (names.some(n => n.endsWith('.csproj') || n.endsWith('.sln'))) return 'csharp';
  if (names.includes('artisan')) return 'laravel';
  if (names.includes('package.json')) {
    let txt = '';
    try { txt = fs.readFileSync(path.join(dir, 'package.json'), 'utf8'); } catch {}
    return txt.includes('"next"') ? 'next' : 'node';
  }
  return null;
}

/** Looks at the project folder and one level below for known stacks. */
function services(p) {
  const out = [];
  const k = kind(p);
  if (k) out.push({ kind: k, dir: p });
  for (const d of dirs(p)) {
    if (heavy.has(d)) continue;
    const sub = path.join(p, d);
    const sk = kind(sub);
    if (sk) out.push({ kind: sk, dir: sub });
    else if (out.length === 0) {
      for (const d2 of dirs(sub)) {
        if (heavy.has(d2)) continue;
        const k2 = kind(path.join(sub, d2));
        if (k2) out.push({ kind: k2, dir: path.join(sub, d2) });
      }
    }
  }
  return out;
}

const registryFile = root => path.join(root, '.meetcoder', 'projects.json');

/** Scans the projects root and merges what it finds with the saved registry. */
function scan(root) {
  try { fs.mkdirSync(path.join(root, '.meetcoder'), { recursive: true }); } catch {}
  const saved = {};
  try {
    const list = JSON.parse(fs.readFileSync(registryFile(root), 'utf8'));
    for (const p of list) saved[p.path] = p;
  } catch {}
  const out = [];
  for (const name of dirs(root)) {
    const p0 = path.join(root, name);
    const p = saved[p0] ? { ...newProject(name, p0), ...saved[p0] } : newProject(name, p0);
    p.services = services(p0);
    p.topFiles = files(p0).filter(f => !heavy.has(f)).slice(0, 25);
    out.push(p);
  }
  save(out, root);
  return out;
}

function save(projects, root) {
  try { fs.writeFileSync(registryFile(root), JSON.stringify(projects, null, 2)); } catch {}
}

// ---- Notes ----

const pad = n => String(n).padStart(2, '0');
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function notesFile(root, project) {
  if (project) {
    try { fs.mkdirSync(path.join(project.path, 'notes'), { recursive: true }); } catch {}
    return path.join(project.path, 'notes', `${today()}.md`);
  }
  return path.join(root, `${today()}.md`);
}

function append(text, file, title) {
  let body;
  try { body = fs.readFileSync(file, 'utf8'); } catch { body = `# ${title}\n`; }
  if (!body.endsWith('\n')) body += '\n';
  body += text + '\n';
  try { fs.writeFileSync(file, body, 'utf8'); } catch {}
}

/** Once the project is known, notes taken in the root for today move into the project. */
function moveRootNotes(root, project) {
  const src = notesFile(root, null);
  let txt;
  try { txt = fs.readFileSync(src, 'utf8'); } catch { return; }
  const lines = txt.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].startsWith('# ')) i++;
  append(lines.slice(i).join('\n').trim(), notesFile(root, project), `Jegyzetek — ${today()}`);
  try { fs.rmSync(src); } catch {}
}

// ---- Shadow history ----

/** A private history kept outside the project so every change can be shown and undone without branches. */
const Shadow = {
  gitDir(p) { return path.join(Paths.shadow, p.path.replace(/[\\/:]/g, '_') + '.git'); },

  git(p, args) {
    return Shell.run('git', ['--git-dir', Shadow.gitDir(p), '--work-tree', p.path,
      '-c', 'user.name=MeetCoder', '-c', 'user.email=meetcoder@local',
      '-c', 'core.quotepath=false', '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false',
      '-c', 'core.longpaths=true', ...args], { cwd: p.path });
  },

  async prepare(p) {
    const dir = Shadow.gitDir(p);
    if (!fs.existsSync(path.join(dir, 'HEAD'))) {
      await Shadow.git(p, ['init', '-q']);
      const exclude = ['node_modules/', 'vendor/', '.next/', 'bin/Debug/', 'bin/Release/', 'obj/', 'dist/', 'build/',
        '.vs/', '.idea/', 'storage/', '*.log', '.env', '.git/', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'notes/'].join('\n');
      try {
        fs.mkdirSync(path.join(dir, 'info'), { recursive: true });
        fs.writeFileSync(path.join(dir, 'info', 'exclude'), exclude, 'utf8');
      } catch {}
    }
    await Shadow.git(p, ['add', '-A']);
    await Shadow.git(p, ['commit', '-q', '--allow-empty', '-m', 'snapshot']);
  },

  /** Records whatever changed since `prepare`. Returns null if nothing did. */
  async record(p, message) {
    await Shadow.git(p, ['add', '-A']);
    const stat = await Shadow.git(p, ['diff', '--cached', '--numstat']);
    const files = stat.out.split('\n').map(line => {
      const parts = line.split('\t');
      if (parts.length < 3) return null;
      return { path: parts.slice(2).join('\t').replace(/\r$/, ''), added: parseInt(parts[0], 10) || 0, removed: parseInt(parts[1], 10) || 0 };
    }).filter(Boolean);
    if (files.length === 0) return null;
    const diff = await Shadow.git(p, ['diff', '--cached', '--no-color', '-U2']);
    await Shadow.git(p, ['commit', '-q', '-m', message]);
    const hd = await Shadow.git(p, ['rev-parse', 'HEAD']);
    return { files, diff: head(diff.out, 60000), commit: hd.out.trim() };
  },

  async undo(p, commit) {
    const r = await Shadow.git(p, ['revert', '--no-edit', commit]);
    if (r.code !== 0) await Shadow.git(p, ['revert', '--abort']);
    return r.code === 0;
  },
};

module.exports = { dirs, files, services, scan, save, today, notesFile, append, moveRootNotes, Shadow, isDir };
