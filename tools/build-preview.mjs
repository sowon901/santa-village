// 미리보기용: JS를 esbuild로 번들해 HTML 한 파일로 합칩니다. (node tools/build-preview.mjs [out.html])
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || resolve(root, 'dist/preview.html');
const r = await build({
  entryPoints: [resolve(root, 'public/js/main.js')],
  bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', logLevel: 'warning',
});
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(resolve(root, 'public/style.css'), 'utf8');
let html = readFileSync(resolve(root, 'public/index.template.html'), 'utf8');
html = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '')
  .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
  .replace('<script type="module" src="js/main.js"></script>', () => `<script>${js}</script>`);
import('node:fs').then(({ mkdirSync }) => { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html); console.log('wrote', out, (html.length / 1024).toFixed(0) + 'KB'); });
