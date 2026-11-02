// Tiny static server: serves this repository at /raff-store/ (same path as GitHub Pages).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = +process.env.PORT || 4173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.sql': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') { res.writeHead(302, { location: '/raff-store/' }); return res.end(); }
  if (!url.pathname.startsWith('/raff-store/')) { res.writeHead(404); return res.end('Not found'); }
  let rel = decodeURIComponent(url.pathname.slice('/raff-store/'.length));
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT) || /(^|\/)(node_modules|\.git)(\/|$)/.test(rel)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { fs.readFile(path.join(ROOT, '404.html'), (e2, d2) => { res.writeHead(404, { 'content-type': TYPES['.html'] }); res.end(e2 ? 'Not found' : d2); }); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}/raff-store/`));
