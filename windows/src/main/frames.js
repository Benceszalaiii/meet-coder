'use strict';
const fs = require('fs');
const path = require('path');
const { Paths } = require('./models');

/** Change check on the tiny grayscale thumbnails produced by the renderer. */
function differs(a, b) {
  if (!a || !b || a.length !== b.length) return true;
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 5) changed++;
  return changed >= 1;
}

/** True when enough text lines changed to be worth sending to the model. */
function textChanged(oldSet, newSet) {
  if (oldSet.size === 0) return newSet.size !== 0;
  let n = 0;
  for (const x of oldSet) if (!newSet.has(x)) n++;
  for (const x of newSet) if (!oldSet.has(x)) n++;
  return n >= 2;
}

function saveJPEG(nativeImage, png, index) {
  try {
    const img = nativeImage.createFromBuffer(Buffer.from(png));
    const d = img.toJPEG(60);
    const p = path.join(Paths.frames, `frame-${index % 6}.jpg`);
    fs.writeFileSync(p, d);
    return p;
  } catch { return null; }
}

module.exports = { differs, textChanged, saveJPEG };
