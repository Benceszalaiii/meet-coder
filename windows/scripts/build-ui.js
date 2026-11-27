const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(root, 'src/renderer/app.jsx')],
  bundle: true, outfile: path.join(dist, 'app.js'), jsx: 'automatic', jsxImportSource: 'preact',
  target: 'chrome120', minify: true, sourcemap: false, logLevel: 'info',
});
for (const f of ['index.html', 'styles.css']) fs.copyFileSync(path.join(root, 'src/renderer', f), path.join(dist, f));
// TeX Gyre Heros (GUST Font License), the Nievau face.
fs.cpSync(path.join(root, 'src/renderer/fonts'), path.join(dist, 'fonts'), { recursive: true });
