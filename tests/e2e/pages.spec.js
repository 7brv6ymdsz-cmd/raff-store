import { test, expect } from '../helpers/fixtures.js';

const PAGES = ['', '#/p/14', '#/track', '#/login', '#/signup', '#/wishlist', '#/orders', '#/about', '#/shipping', '#/returns', '#/faq', '#/contact', '#/terms', 'admin/'];

for (const path of PAGES) {
  test(`page loads cleanly: /${path || 'home'} @mobile`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const res = await page.goto(path);
    expect(res.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:visible').first()).toBeVisible();
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).length,
      deadLinks: [...document.querySelectorAll('a[href^="#"]')].filter((a) => {
        const h = a.getAttribute('href');
        if (h.startsWith('#/') || a.hidden || !a.offsetParent) return false;
        return h === '#' || !document.getElementById(h.slice(1));
      }).map((a) => a.textContent.trim()),
    }));
    expect(r.overflow, 'no sideways scrolling').toBeLessThanOrEqual(1);
    expect(r.brokenImages).toBe(0);
    expect(r.deadLinks).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('every internal file and link resolves', async ({ page, request }) => {
  const seen = new Set();
  for (const path of ['', '#/about', 'admin/']) {
    await page.goto(path); await page.waitForLoadState('networkidle');
    (await page.$$eval('a[href], link[href], script[src], img[src]', (els) => els.map((e) => e.href || e.src))).forEach((u) => { if (u.startsWith('http://localhost:4173/')) seen.add(u.split('#')[0]); });
  }
  const bad = [];
  for (const u of seen) { const r = await request.get(u); if (r.status() >= 400) bad.push(`${r.status()} ${u}`); }
  expect(bad).toEqual([]);
  expect(seen.size).toBeGreaterThan(15);
});
