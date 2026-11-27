'use strict';
// Draws the three menu-bar glyphs (record.circle, record.circle.fill, hammer.circle.fill) as raster tray icons.
const { nativeImage } = require('electron');

const S = 32; // pixels (displayed at 16 pt @2x)

function disc(x, y, cx, cy, r) { return Math.hypot(x - cx, y - cy) <= r; }
function rotRect(x, y, cx, cy, w, h, deg) {
  const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
  const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2;
}

const shapes = {
  'record.circle': (x, y) => {
    const d = Math.hypot(x - 16, y - 16);
    return (d <= 14.5 && d >= 12.3) || d <= 7.2;
  },
  'record.circle.fill': (x, y) => {
    const d = Math.hypot(x - 16, y - 16);
    return d <= 14.5 && !(d > 9.6 && d < 11.6);
  },
  'hammer.circle.fill': (x, y) => {
    if (!disc(x, y, 16, 16, 14.5)) return false;
    const handle = rotRect(x, y, 16, 17, 3.2, 15, 45);
    const head = rotRect(x, y, 11.2, 11.2, 11, 4.6, -45) || rotRect(x, y, 21.2, 11.2, 0, 0, 0);
    return !(handle || head);
  },
};

const cache = {};
function icon(name, white) {
  const key = name + (white ? 'w' : 'b');
  if (cache[key]) return cache[key];
  const buf = Buffer.alloc(S * S * 4);
  const f = shapes[name], n = 4;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = 0;
    for (let sy = 0; sy < n; sy++) for (let sx = 0; sx < n; sx++) if (f(x + (sx + 0.5) / n, y + (sy + 0.5) / n)) c++;
    const a = Math.round((c / (n * n)) * 255), v = white ? 255 : 0, o = (y * S + x) * 4;
    buf[o] = v; buf[o + 1] = v; buf[o + 2] = v; buf[o + 3] = a; // BGRA
  }
  return (cache[key] = nativeImage.createFromBitmap(buf, { width: S, height: S, scaleFactor: 2 }));
}

module.exports = { icon };
