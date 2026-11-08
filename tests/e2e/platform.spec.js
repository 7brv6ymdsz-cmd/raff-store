import { test, expect } from '../helpers/fixtures.js';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The live site: Rawaj platform homepage, legal and halal pages, sounds and the brand kit (real data/store.json).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const real = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/store.json'), 'utf8'));
const serve = (page, edit) => page.route('**/data/store.json*', (route) => { const d = real(); if (edit) edit(d); return route.fulfill({ body: JSON.stringify(d), contentType: 'application/json' }); });
const lang = (page, l) => page.addInitScript((v) => { try { if (!sessionStorage.getItem('t.lang')) { localStorage.setItem('raff.lang', v); sessionStorage.setItem('t.lang', '1'); } } catch { /* ignore */ } }, l);

test('Rawaj homepage in Arabic and English: honest product states, plans from settings, halal and legal links @mobile', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await serve(page, (d) => { d.settings.billing.plans[0].price = 129; });
  await lang(page, 'ar');
  await page.goto('');
  const L = page.locator('#landing');
  await expect(L.locator('.l-hero h1')).toContainText('خلّي شغلك');
  await expect(page).toHaveTitle(/رواج/);
  await expect(L.locator('.rw-products article.on')).toContainText('متاح الآن');
  await expect(L.locator('.rw-products article.soon')).toContainText('قريباً');
  await expect(L.locator('.rw-soon')).toContainText('قريباً');
  await expect(L.locator('.rw-plans article')).toHaveCount(2);
  await expect(L.locator('.rw-plans article').first()).toContainText('١٢٩');
  await expect(L.locator('.l-hero .l-btn')).toHaveAttribute('href', '#/signup?next=mizan');
  await expect(L.locator('a[href="#/halal"]').first()).toBeVisible();
  for (const h of ['#/terms', '#/halal', '#/privacy', '#/data-deletion', 'brand/']) await expect(L.locator(`.l-foot a[href="${h}"]`)).toHaveCount(1);
  const ld = JSON.parse(await page.locator('#ldlanding').textContent());
  expect(ld['@type']).toBe('SoftwareApplication');
  expect(ld.offers.map((o) => o.price)).toEqual(['129', '249']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

  await L.locator('[data-l-lang]').click();
  await expect(L.locator('.l-hero h1')).toContainText('Make your business');
  await expect(page).toHaveTitle(/Rawaj/);
  await expect(L.locator('.rw-products article.soon')).toContainText('Coming soon');
  expect(errors).toEqual([]);
});

test('sounds are off until the visitor turns them on, and the choice is remembered', async ({ page }) => {
  await serve(page);
  await page.goto('');
  const t = page.locator('#landing [data-sound-toggle]');
  await expect(t).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.RaffSound.on)).toBe(false);
  await t.click();
  await expect(t).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('#landing [data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true');
  for (const s of ['tap', 'pop', 'success', 'notify', 'error', 'whoosh', 'reveal']) {
    const r = await page.request.get(`brand/sounds/${s}.mp3`);
    expect(r.status(), s).toBe(200);
    expect((await r.body()).length, s).toBeLessThan(20000);
  }
});

test('legal pages: terms, halal use, privacy and data deletion', async ({ page }) => {
  await serve(page);
  const pages = [['#/terms', 'شروط الاستخدام', 'الاشتراك والدفع'], ['#/halal', 'سياسة الاستخدام الحلال', 'الربا'], ['#/privacy', 'سياسة الخصوصية', 'ما منبيع بياناتك'], ['#/data-deletion', 'حذف حسابك وبياناتك', '٣٠ يوم']];
  for (const [h, title, text] of pages) {
    await page.goto(h);
    await expect(page.locator('.legal h1')).toHaveText(title);
    await expect(page.locator('.legal')).toContainText(text);
  }
});

test('the brand kit page and every file it offers are there', async ({ page, request }) => {
  await page.goto('brand/');
  await expect(page.locator('h1')).toContainText('رواج');
  const links = await page.locator('a[href]:not([href^="../"]):not([href^="#"])').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  const media = await page.locator('img[src], video[src], audio[src], video[poster]').evaluateAll((els) => els.flatMap((e) => [e.getAttribute('src'), e.getAttribute('poster')]).filter(Boolean));
  for (const f of [...new Set([...links, ...media])]) {
    const r = await request.get(`brand/${f}`);
    expect(r.status(), f).toBe(200);
  }
  const manifest = await (await request.get('manifest.webmanifest')).json();
  for (const i of manifest.icons) expect((await request.get(i.src)).status(), i.src).toBe(200);
});

test('admin refuses a product that breaks the halal policy, with a clear reason', async ({ page }) => {
  const PIN = '246810';
  await page.goto('admin/');
  await page.fill('#pin', PIN); await page.fill('#pin2', PIN); await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  await page.goto('admin/#products');
  await page.locator('[data-act="new-product"]').first().click();
  await page.fill('#editor [name=name]', 'نبيذ أحمر فاخر');
  await page.fill('#editor [name=price]', '20');
  await page.click('#edSave');
  await expect(page.locator('#edErr')).toContainText('سياسة الاستخدام الحلال');
  await expect(page.locator('#edErr')).toContainText('الخمور');
  await page.fill('#editor [name=name]', 'كتاب الميزانية الشخصية');
  await page.click('#edSave');
  await expect(page.locator('.pc', { hasText: 'كتاب الميزانية الشخصية' })).toBeVisible();
});

for (const [name, hash] of [['home', ''], ['halal policy', '#/halal']]) {
  test(`no serious accessibility problems: Rawaj ${name}`, async ({ page }) => {
    await serve(page);
    await page.goto(hash);
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).include(hash ? '#page' : '#landing').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  });
}
