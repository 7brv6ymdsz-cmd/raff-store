import { test, expect } from '../helpers/fixtures.js';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// These tests use the store's real published catalog (the single-product homepage for Mizan).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const real = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/store.json'), 'utf8'));
// these tests cover the single-product mode; the live site uses the platform mode (tests/e2e/platform.spec.js)
const productMode = (d) => { d.settings.landing = { on: true, pid: 8 }; d.products.find((p) => p.id === 8).hidden = false; };
const serve = (page, edit) => page.route('**/data/store.json*', (route) => {
  const d = real(); productMode(d); if (edit) edit(d);
  return route.fulfill({ body: JSON.stringify(d), contentType: 'application/json' });
});
// sets the visitor's starting language once; a choice made on the page afterwards is kept across reloads
const lang = (page, l) => page.addInitScript((v) => { try { if (!sessionStorage.getItem('t.lang')) { localStorage.setItem('raff.lang', v); sessionStorage.setItem('t.lang', '1'); } } catch { /* ignore */ } }, l);
const noOverflow = async (page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

test('single-product home in English and Arabic, without the catalog chrome @mobile', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await serve(page);
  await lang(page, 'en');
  await page.goto('');
  const L = page.locator('#landing');
  await expect(L.locator('.l-hero h1')).toContainText('Know your real profit');
  await expect(page.locator('.hero')).toBeHidden();
  await expect(page.locator('#main')).toBeHidden();
  await expect(page.locator('.rail')).toBeHidden();
  await expect(page).toHaveTitle(/Mizan/);
  await expect(L.locator('.m-col span').first()).toHaveText('J');
  await expect(L.locator('[data-l-buy]').first()).toContainText('$29');
  const ld = JSON.parse(await page.locator('#ldlanding').textContent());
  expect(ld.offers.price).toBe('29');
  await expect(L.locator('.l-cta .l-link')).toHaveAttribute('href', 'previews/mizan-guide-en.pdf');
  await noOverflow(page);

  await L.locator('[data-l-lang]').click();
  await expect(L.locator('.l-wrap')).toHaveAttribute('dir', 'rtl');
  await expect(L.locator('.l-hero h1')).toContainText('اعرف ربحك الحقيقي');
  await expect(L.locator('.l-cta .l-link')).toHaveAttribute('href', 'previews/mizan-guide-ar.pdf');
  await page.reload();
  await expect(L.locator('.l-hero h1')).toContainText('اعرف ربحك الحقيقي'); // the choice is remembered
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('free guide previews and product image exist', async ({ request }) => {
  for (const f of ['previews/mizan-guide-en.pdf', 'previews/mizan-guide-ar.pdf', 'assets/products/mizan-1.jpg', 'og.png']) {
    const r = await request.get(f);
    expect(r.status(), f).toBe(200);
  }
});

test('buying without a checkout link opens the digital checkout with the product', async ({ page }) => {
  await serve(page);
  await lang(page, 'ar');
  await page.goto('');
  await page.locator('.l-hero [data-l-buy]').click();
  await expect(page.locator('[data-view="checkout"]')).toBeVisible();
  await expect(page.locator('#checkoutForm [data-f=address]')).toBeHidden();
  await expect(page.locator('#payMethods input[value=cod]')).toHaveCount(0);
  await expect(page.locator('#coSummary .grand')).toContainText('٢٩');
  await page.locator('[data-action="close-cart"]').first().click().catch(() => {});
  // a second click does not add a second copy
  await page.goto('');
  await page.locator('.l-final [data-l-buy]').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('raff.cart')).length)).toBe(1);
});

test('with a checkout link, every buy button goes straight to the payment page', async ({ page }) => {
  await serve(page, (d) => { d.products.find((p) => p.id === 8).buyUrl = 'https://payhip.com/b/MIZAN'; });
  await lang(page, 'en');
  await page.goto('');
  const btns = page.locator('#landing [data-l-buy]');
  await expect(btns).toHaveCount(4);
  for (const b of await btns.all()) {
    await expect(b).toHaveAttribute('href', 'https://payhip.com/b/MIZAN');
    await expect(b).toHaveAttribute('target', '_blank');
  }
});

test('section links stay on the homepage; other pages keep the normal store', async ({ page }) => {
  await serve(page);
  await lang(page, 'en');
  await page.goto('');
  await page.locator('.l-nav nav a[href="#l-faq"]').click();
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#l-faq')).toBeInViewport();
  await page.goto('#/p/8');
  await expect(page.locator('#landing')).toBeHidden();
  await expect(page.locator('.pd-name')).toContainText('ميزان');
  await expect(page.locator('#ldlanding')).toHaveCount(0);
  await page.goto('#/');
  await expect(page.locator('#landing')).toBeVisible();
  await expect(page.locator('#ldlanding')).toHaveCount(1);
});

test('turning the single-product home off brings back the catalog', async ({ page }) => {
  await serve(page);
  await page.goto('');
  await expect(page.locator('#landing')).toBeVisible();
  await page.unroute('**/data/store.json*');
  await serve(page, (d) => { d.settings.landing.on = false; });
  await page.reload();
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('#landing')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('raff.landing'))).toBeNull();
  await expect(page.locator('html')).not.toHaveClass(/landing/);
});

for (const l of ['en', 'ar']) {
  test(`no serious accessibility problems on the single-product home (${l})`, async ({ page }) => {
    await serve(page);
    await lang(page, l);
    await page.goto('');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#landing .l-hero h1')).toBeVisible();
    const r = await new AxeBuilder({ page }).include('#landing').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  });
}

test('a first-time visitor never sees the catalog home flash before the product page', async ({ page }) => {
  await serve(page);
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      window.heroAtStart = getComputedStyle(document.querySelector('.hero')).display;
    });
  });
  await page.goto('');
  await expect(page.locator('#landing .l-hero h1')).toBeVisible();
  expect(await page.evaluate(() => window.heroAtStart)).toBe('none');
});

test('if the catalog cannot load, the visitor sees an explanation, not a blank page', async ({ page }) => {
  await page.route('**/data/store.json*', (route) => route.fulfill({ status: 500, body: 'down' }));
  await page.goto('');
  await expect(page.locator('#sections')).toContainText('ما قدرنا نحمّل المنتجات');
  await expect(page.locator('html')).not.toHaveClass(/landing/);
});
