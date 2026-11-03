import { test, expect } from '../helpers/fixtures.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A digital-only catalog: product 1 sells through an external checkout link (Payhip), the rest are ordered manually.
const DIGITAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/digital.json');
test.beforeEach(async ({ page }) => {
  await page.route('**/data/store.json*', (route) => route.fulfill({ path: DIGITAL, contentType: 'application/json' }));
});

test('digital cards and product page: external checkout link, preview and specs @mobile', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('');
  await expect(page.locator('.pcard .tag.digi').first()).toBeVisible();
  // the + on a product with a checkout link opens its page instead of the cart
  await page.locator('#picks [data-add="1"], .grid [data-add="1"]').first().click();
  await expect(page).toHaveURL(/#\/p\/1$/);
  const buy = page.locator('#pdExt');
  await expect(buy).toBeVisible();
  await expect(buy).toHaveAttribute('href', 'https://payhip.com/b/TEST1');
  await expect(buy).toHaveAttribute('target', '_blank');
  await expect(buy).toHaveAttribute('rel', /noopener/);
  await expect(page.locator('#pdBuy [type=submit]')).toBeHidden();
  await expect(page.locator('#pdBuyNow')).toBeHidden();
  await expect(page.locator('.stepper')).toBeHidden();
  await expect(page.locator('.pd-preview')).toHaveAttribute('href', 'https://example.com/sample.pdf');
  await expect(page.locator('.pd-specs')).toContainText('PDF');
  await expect(page.locator('.pd-stock')).toContainText('تحميل فوري');
  await expect(page.locator('.pd-gets li')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('manual digital order: no address, no shipping, no cash on delivery, delivery email in the WhatsApp order', async ({ page }) => {
  await page.goto('#/p/4');
  await page.click('#pdBuy [type=submit]');
  await page.click('#pdBuy [type=submit]'); // second copy is refused
  await page.click('#pdBuyNow');
  await expect(page.locator('[data-view="checkout"]')).toBeVisible();
  const f = page.locator('#checkoutForm');
  await expect(f.locator('[data-f=city]')).toBeHidden();
  await expect(f.locator('[data-f=address]')).toBeHidden();
  await expect(f.locator('legend').first()).toHaveText('معلومات التسليم');
  await expect(page.locator('#payMethods input[value=cod]')).toHaveCount(0);
  await expect(page.locator('#payMethods input[value=paypal]')).toHaveCount(1);
  await expect(page.locator('#coSummary')).toContainText('رقمي');
  await expect(page.locator('#coSummary .grand')).toContainText('٢٩');
  await f.locator('[name=name]').fill('سارة');
  await f.locator('[name=phone]').fill('0791234567');
  await f.locator('[name=email]').fill('sara@example.com');
  await f.locator('[type=submit]').click();
  await expect(page.locator('[data-view="done"]')).toBeVisible();
  await expect(page.locator('#doneBody')).toContainText('sara@example.com');
  const wa = await page.locator('#doneBody a[href^="https://wa.me/962795550101"]').getAttribute('href');
  const text = decodeURIComponent(wa.split('text=')[1]);
  expect(text).toContain('التسليم: رقمي');
  expect(text).toContain('الإيميل: sara@example.com');
  expect(text).not.toContain('العنوان:');
  expect(text).toMatch(/× (1|١) = /);
  // the order code the owner imports keeps the email and the digital flag
  const back = await page.evaluate((t) => window.RaffShared.decodeOrder(t), text);
  expect(back.customer.email).toBe('sara@example.com');
  expect(back.items[0].digital).toBe(true);
  expect(back.total).toBe(29);
});

test('delivery pages, footer and instant answers speak digital', async ({ page }) => {
  await page.goto('#/shipping');
  await expect(page.locator('h1.pg-title')).toHaveText('التسليم والتحميل');
  await expect(page.locator('footer a[href="#/shipping"]')).toHaveText('التسليم والتحميل');
  await page.goto('#/returns');
  await expect(page.locator('h1.pg-title')).toHaveText('الاسترداد');
  const r = await page.evaluate(() => window.RaffAnswers.answer('ما وصلني رابط التحميل'));
  expect(JSON.stringify(r)).toContain('download');
  const pay = await page.evaluate(() => window.RaffAnswers.knowledge().find((x) => x.id === 'payment').a);
  expect(pay).not.toContain('نقداً');
});

test('admin: new products are digital, links are validated, inventory skips them', async ({ page }) => {
  const PIN = '864200';
  await page.goto('admin/');
  await page.fill('#pin', PIN); await page.fill('#pin2', PIN); await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  await page.goto('admin/#products');
  await page.locator('[data-act="new-product"]').first().click();
  await expect(page.locator('#editor [name=ptype][value=digital]')).toBeChecked();
  await expect(page.locator('#digiEd')).toBeVisible();
  await expect(page.locator('#editor [name=stock]')).toBeHidden();
  await page.fill('#editor [name=name]', 'كتابي الأول');
  await page.fill('#editor [name=price]', '7');
  await page.fill('#editor [name=buyUrl]', 'javascript:alert(1)');
  await page.click('#edSave');
  await expect(page.locator('#edErr')).toContainText('https://');
  await page.fill('#editor [name=buyUrl]', 'https://gumroad.com/l/mine');
  await page.fill('#editor [name=details]', 'كتاب PDF\nتمارين');
  await page.click('#edSave');
  await expect(page.locator('.pc', { hasText: 'كتابي الأول' }).locator('.digi-badge')).toBeVisible();
  // switching to physical brings stock back
  await page.locator('[data-act="new-product"]').first().click();
  await page.click('#editor .type-seg label:has([value=physical])');
  await expect(page.locator('#digiEd')).toBeHidden();
  await expect(page.locator('#editor [name=stock]')).toBeVisible();
  await page.click('[data-act="close-modal"]');
  await page.goto('admin/#inventory');
  await expect(page.locator('#view')).toContainText('منتج رقمي ما إله مخزون');
  await expect(page.locator('#invList')).not.toContainText('كتابي الأول');
});

test('the real catalog: every product is digital, priced, and its images and free preview exist', async () => {
  const fs = await import('node:fs');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const store = JSON.parse(fs.readFileSync(path.join(root, 'data/store.json'), 'utf8'));
  expect(store.products.length).toBeGreaterThanOrEqual(6);
  for (const p of store.products) {
    expect(p.type, p.name).toBe('digital');
    expect(p.demo, p.name).toBeFalsy();
    expect(p.price, p.name).toBeGreaterThan(0);
    expect(store.categories.some((c) => c.id === p.cat), p.name).toBe(true);
    for (const img of p.images) expect(fs.existsSync(path.join(root, img)), img).toBe(true);
    if (p.previewUrl) {
      expect(p.previewUrl).toMatch(/^https:\/\/7brv6ymdsz-cmd\.github\.io\/raff-store\/previews\//);
      expect(fs.existsSync(path.join(root, p.previewUrl.split('/raff-store/')[1])), p.previewUrl).toBe(true);
    }
  }
});
