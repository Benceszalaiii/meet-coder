'use strict';
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { StreamProc } = require('./shell');
const { hasCSharp } = require('./models');

const urlRegex = /https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+/;
// eslint-disable-next-line no-control-regex
const ansi = /\u001b\[[0-9;?]*[A-Za-z]/g;

/**
 * What to run for a service: optional setup commands, then the long-running commands.
 * Scripts are cmd.exe command lines. C# services are never run or built.
 */
function plan(s) {
  switch (s.kind) {
    case 'next':
    case 'node': {
      let pkg = '';
      try { pkg = fs.readFileSync(path.join(s.dir, 'package.json'), 'utf8'); } catch {}
      let run;
      if (pkg.includes('"dev"')) run = 'npm run dev';
      else if (pkg.includes('"start"')) run = 'npm start';
      else {
        const f = ['server.js', 'index.js', 'app.js', 'src/index.js', 'src/server.js'].find(x => fs.existsSync(path.join(s.dir, x)));
        if (!f) return null;
        run = `node --watch ${f}`;
      }
      return { setup: 'if not exist node_modules call npm install --no-audit --no-fund', runs: [{ script: `call ${run}`, prefix: '', main: true }] };
    }
    case 'laravel': {
      const setup = [
        '(if not exist vendor call composer install --no-interaction --no-progress)',
        '(if not exist .env if exist .env.example (copy .env.example .env >nul & php artisan key:generate))',
        '(if exist package.json if not exist node_modules call npm install --no-audit --no-fund)',
      ].join(' & ');
      const runs = [{ script: 'php artisan serve', prefix: '', main: true }];
      if (fs.existsSync(path.join(s.dir, 'package.json'))) runs.unshift({ script: 'call npm run dev', prefix: '[vite] ', main: false });
      return { setup, runs };
    }
    default:
      return null; // csharp: write code only
  }
}

class DevServer extends EventEmitter {
  constructor() {
    super();
    this.lines = [];
    this.url = null;
    this.status = 'Nem fut';
    this.running = false;
    this.reloadToken = 0;
    this.procs = [];
    this.active = 0;
    this.projectPath = null;
    this.gen = 0;
  }

  changed() { this.emit('change'); }

  start(project) {
    if (this.projectPath === project.path && this.running) return;
    this.stop();
    this.projectPath = project.path;
    this.lines = [];
    this.url = null;
    const runnable = project.services.map(s => ({ s, plan: plan(s) })).filter(x => x.plan);
    if (runnable.length === 0) {
      this.status = hasCSharp(project) ? 'C# projekt — csak kódírás, nincs futtatás' : 'Nincs indítható szerver';
      this.changed();
      return;
    }
    this.running = true;
    this.status = 'Indítás…';
    const gen = ++this.gen;
    this.changed();
    for (const { s: svc, plan: pl } of runnable) {
      const label = runnable.length > 1 ? `[${path.basename(svc.dir)}] ` : '';
      this.runService(project.path, svc, pl, label, gen);
    }
  }

  push(projectPath, label, svc, raw) {
    if (this.projectPath !== projectPath) return;
    const line = raw.replace(ansi, '');
    this.lines.push(label + line);
    if (this.lines.length > 400) this.lines.splice(0, this.lines.length - 400);
    if (!line.startsWith('[vite]') && (this.url == null || svc.kind === 'next' || svc.kind === 'laravel')) {
      const m = urlRegex.exec(line);
      if (m && (this.url == null || line.includes('Server running') || line.includes('Local'))) {
        this.url = m[0];
        this.status = 'Fut';
      }
    }
    this.changed();
  }

  async runService(projectPath, svc, pl, label, gen) {
    if (this.gen === gen) this.active++;
    const onLine = prefix => raw => this.push(projectPath, label, svc, prefix + raw);
    let mainCode = 0;
    try {
      if (pl.setup) {
        const sp = new StreamProc();
        this.procs.push(sp);
        const code = await sp.run({ script: pl.setup }, { cwd: svc.dir, onLine: onLine('') });
        if (this.gen !== gen) return;
        if (code !== 0) mainCode = code;
      }
      await Promise.all(pl.runs.map(async r => {
        const proc = new StreamProc();
        this.procs.push(proc);
        const code = await proc.run({ script: r.script }, { cwd: svc.dir, onLine: onLine(r.prefix) });
        if (r.main) mainCode = code;
      }));
    } finally {
      if (this.gen === gen) this.active--;
    }
    if (this.gen !== gen) return;
    this.lines.push(label + `— leállt (kód: ${mainCode})`);
    if (this.active === 0) { this.running = false; this.status = 'Leállt'; }
    this.changed();
  }

  stop() {
    this.procs.forEach(p => p.terminate());
    this.procs = [];
    this.projectPath = null;
    this.gen++;
    this.active = 0;
    this.running = false;
    this.url = null;
    this.status = 'Nem fut';
    this.changed();
  }

  reload() { this.reloadToken += 1; this.changed(); }

  snapshot() { return { lines: this.lines, url: this.url, status: this.status, running: this.running, reloadToken: this.reloadToken }; }
}

module.exports = { DevServer };
