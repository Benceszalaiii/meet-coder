'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const crossSpawn = require('cross-spawn');
const { StringDecoder } = require('string_decoder');

const isWin = process.platform === 'win32';

/** Environment with the user's real PATH plus the places CLI tools usually live. */
const env = (() => {
  const e = { ...process.env };
  const home = os.homedir();
  const key = Object.keys(e).find(k => k.toLowerCase() === 'path') || 'PATH';
  let p = e[key] || '';
  const extra = [
    path.join(home, '.local', 'bin'),
    path.join(home, '.config', 'herd-lite', 'bin'),
    process.env.APPDATA ? path.join(process.env.APPDATA, 'npm') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'claude') : null,
  ].filter(Boolean);
  const have = p.split(path.delimiter).map(x => x.toLowerCase());
  for (const x of extra) if (!have.includes(x.toLowerCase())) p += (p ? path.delimiter : '') + x;
  e[key] = p;
  e.NO_COLOR = '1';
  e.FORCE_COLOR = '0';
  return e;
})();

function pathDirs() {
  const key = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
  return (env[key] || '').split(path.delimiter).filter(Boolean);
}

function findOnPath(name) {
  if (/[\\/]/.test(name) && fs.existsSync(name)) return name;
  const exts = isWin ? ['.exe', '.com', '.cmd', '.bat', ''] : [''];
  for (const d of pathDirs()) {
    for (const x of exts) {
      const f = path.join(d, name + x);
      try { if (fs.statSync(f).isFile()) return f; } catch {}
    }
  }
  return null;
}

/**
 * Resolves a command to something spawnable without going through cmd.exe, so long multi-line
 * arguments (system prompts) arrive intact. npm's `.cmd` shims are unwrapped to `node script.js`.
 */
function resolve(exe, args) {
  const found = findOnPath(exe);
  if (!found) return { file: exe, args };
  if (isWin && /\.(cmd|bat)$/i.test(found)) {
    try {
      const txt = fs.readFileSync(found, 'utf8');
      const m = /"%dp0%\\([^"]+\.(?:c|m)?js)"/i.exec(txt) || /"%~dp0\\([^"]+\.(?:c|m)?js)"/i.exec(txt);
      if (m) {
        const dir = path.dirname(found);
        const script = path.join(dir, m[1]);
        const localNode = path.join(dir, 'node.exe');
        const node = fs.existsSync(localNode) ? localNode : (findOnPath('node') || 'node');
        return { file: node, args: [script, ...args] };
      }
    } catch {}
  }
  return { file: found, args };
}

function spawnResolved(exe, args, opts) {
  const r = resolve(exe, args);
  return crossSpawn(r.file, r.args, { windowsHide: true, ...opts });
}

/** Runs a command to completion and collects its output. */
function run(exe, args, { cwd, stdin } = {}) {
  return new Promise(resolveP => {
    let p;
    try {
      p = spawnResolved(exe, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) { resolveP({ code: -1, out: '', err: String(err.message || err) }); return; }
    const out = [], err = [];
    let done = false;
    const finish = (code, extra) => {
      if (done) return; done = true;
      resolveP({ code, out: Buffer.concat(out).toString('utf8'), err: Buffer.concat(err).toString('utf8') + (extra || '') });
    };
    p.stdout.on('data', d => out.push(d));
    p.stderr.on('data', d => err.push(d));
    p.on('error', e => finish(-1, String(e.message || e)));
    p.on('close', code => finish(code == null ? -1 : code));
    p.stdin.on('error', () => {});
    if (stdin != null) p.stdin.write(stdin, 'utf8');
    p.stdin.end();
  });
}

/** A long-running child process tree, streaming output line by line. */
class StreamProc {
  constructor() { this.process = null; }
  get isRunning() { return !!this.process && this.process.exitCode == null && this.process.signalCode == null; }

  /**
   * target: an argv array (run directly) or { script } (a cmd.exe command line).
   * Resolves with the exit code once the process and its output are finished.
   */
  run(target, { cwd, stdin, onLine }) {
    return new Promise(resolveP => {
      let p;
      try {
        if (!Array.isArray(target)) {
          p = cp.spawn(isWin ? 'cmd.exe' : '/bin/sh',
            isWin ? ['/d', '/s', '/c', `"chcp 65001 >nul & ${target.script}"`] : ['-c', target.script],
            { cwd, env, windowsHide: true, windowsVerbatimArguments: true, stdio: ['pipe', 'pipe', 'pipe'], detached: !isWin });
        } else {
          p = spawnResolved(target[0], target.slice(1), { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: !isWin });
        }
      } catch { resolveP(-1); return; }
      this.process = p;
      let open = 2, exit = null, settled = false;
      const settle = () => { if (!settled && open === 0 && exit !== null) { settled = true; resolveP(exit); } };
      const pump = stream => {
        const dec = new StringDecoder('utf8');
        let buf = '';
        const emit = l => onLine(l.endsWith('\r') ? l.slice(0, -1) : l);
        stream.on('data', d => {
          buf += dec.write(d);
          let i;
          while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); emit(l); }
        });
        stream.on('end', () => { buf += dec.end(); if (buf) emit(buf); buf = ''; open--; settle(); });
        stream.on('error', () => { open--; settle(); });
      };
      pump(p.stdout); pump(p.stderr);
      p.on('error', () => { exit = -1; open = 0; settle(); });
      p.on('close', code => { exit = code == null ? -1 : code; settle(); });
      // give lingering grandchildren 2s of output after exit, like the original
      p.on('exit', () => setTimeout(() => { if (exit === null) exit = p.exitCode == null ? -1 : p.exitCode; open = 0; settle(); }, 2000));
      p.stdin.on('error', () => {});
      if (stdin != null) p.stdin.write(stdin, 'utf8');
      p.stdin.end();
    });
  }

  terminate() {
    const p = this.process;
    if (!p || !this.isRunning) return;
    const pid = p.pid;
    if (isWin) {
      // Console children ignore a polite taskkill, and a delayed second attempt would never run if the app is quitting,
      // so the whole tree is killed at once.
      cp.spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
    } else {
      try { process.kill(-pid, 'SIGTERM'); } catch {}
      setTimeout(() => { try { process.kill(-pid, 'SIGKILL'); } catch {} }, 3000);
    }
  }
}

module.exports = { env, run, StreamProc, findOnPath, resolve, isWin };
