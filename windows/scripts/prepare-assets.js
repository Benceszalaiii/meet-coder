// Copies the offline OCR language data (English + Hungarian) next to the app.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'tessdata');
fs.mkdirSync(out, { recursive: true });
for (const l of ['eng', 'hun']) {
  const src = path.join(root, 'node_modules', '@tesseract.js-data', l, '4.0.0_best_int', `${l}.traineddata.gz`);
  fs.copyFileSync(src, path.join(out, `${l}.traineddata.gz`));
}
console.log('tessdata ready');
