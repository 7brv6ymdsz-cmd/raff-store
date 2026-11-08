// Lighthouse audit of the main pages (mobile profile). Usage: node tests/audit/lighthouse.mjs [baseUrl]
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:8766/raff-store/';
const PAGES = [['home', ''], ['product', '#/p/8'], ['faq', '#/faq'], ['admin', 'admin/']];
const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});
fs.mkdirSync('reports', { recursive: true });
const rows = [];
for (const [name, path] of PAGES) {
  const { lhr, report } = await lighthouse(BASE + path, { port: chrome.port, output: 'html', logLevel: 'error' });
  fs.writeFileSync(`reports/lighthouse-${name}.html`, report);
  const s = (k) => Math.round((lhr.categories[k].score || 0) * 100);
  const fails = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable').map((a) => `${a.id}(${a.displayValue || Math.round(a.score * 100)})`);
  rows.push({ page: name, performance: s('performance'), accessibility: s('accessibility'), bestPractices: s('best-practices'), seo: s('seo'), LCP: lhr.audits['largest-contentful-paint'].displayValue, CLS: lhr.audits['cumulative-layout-shift'].displayValue, TBT: lhr.audits['total-blocking-time'].displayValue, below90: fails.slice(0, 12).join(' ') });
}
await chrome.kill();
console.table(rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "below90"))));
rows.forEach((r) => console.log(`${r.page}: ${r.below90 || '—'}`));
fs.writeFileSync('reports/lighthouse.json', JSON.stringify(rows, null, 2));
