// Renders the brand SVGs to PNG at fixed widths (transparent background). Run after build_logo.py.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright');
const A = path.join(ROOT, 'brand/assets') + '/';
const jobs = [
  ['rawaj-mark.svg', 1024, 'rawaj-mark-1024.png'], ['rawaj-mark.svg', 512, 'icon-512.png'], ['rawaj-mark.svg', 192, 'icon-192.png'],
  ['rawaj-mark.svg', 180, 'apple-touch-icon.png'], ['rawaj-maskable.svg', 512, 'maskable-512.png'], ['rawaj-mark.svg', 32, 'favicon-32.png'],
  ['rawaj-logo-ar.svg', 1600, 'rawaj-logo-ar.png'], ['rawaj-logo-en.svg', 1600, 'rawaj-logo-en.png'],
  ['rawaj-logo-ar-white.svg', 1600, 'rawaj-logo-ar-white.png'], ['rawaj-logo-en-white.svg', 1600, 'rawaj-logo-en-white.png'],
];
const b = await chromium.launch(); const p = await b.newPage();
for (const [src, w, out] of jobs) {
  const svg = fs.readFileSync(A + src, 'utf8');
  const [, vw, vh] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const h = Math.round(w * vh / vw);
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace(/width="[\d.]+" height="[\d.]+"/, `width="${w}" height="${h}"`)}</body></html>`);
  await p.locator('svg').screenshot({ path: A + out, omitBackground: true });
  console.log(out, w + 'x' + h, fs.statSync(A + out).size);
}
await b.close();
