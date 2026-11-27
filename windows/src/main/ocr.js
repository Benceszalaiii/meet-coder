'use strict';
const fs = require('fs');
const path = require('path');

let workerP = null;
let chain = Promise.resolve();

function langPath() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'tessdata') : null,
    path.join(__dirname, '..', '..', 'tessdata'),
  ].filter(Boolean);
  return candidates.find(c => fs.existsSync(path.join(c, 'eng.traineddata.gz'))) || candidates[candidates.length - 1];
}

function worker(cacheDir) {
  if (!workerP) {
    const { createWorker } = require('tesseract.js');
    workerP = createWorker(['eng', 'hun'], 1, { langPath: langPath(), cachePath: cacheDir, gzip: true })
      .then(async w => { await w.setParameters({ user_defined_dpi: '150' }); return w; })
      .catch(e => { workerP = null; throw e; });
  }
  return workerP;
}

/** On-device text recognition. Returns the recognised lines joined by newlines (calls are serialised). */
function recognize(png, cacheDir) {
  const job = chain.then(async () => {
    try {
      const w = await worker(cacheDir);
      const { data } = await w.recognize(png);
      const lines = (data.lines && data.lines.length ? data.lines.map(l => l.text) : String(data.text || '').split('\n'))
        .map(t => t.replace(/\s+$/, '').replace(/^\s+/, '')).filter(Boolean);
      return lines.join('\n');
    } catch { return ''; }
  });
  chain = job.catch(() => {});
  return job;
}

async function shutdown() {
  if (!workerP) return;
  try { const w = await workerP; await w.terminate(); } catch {}
  workerP = null;
}

module.exports = { recognize, shutdown };
