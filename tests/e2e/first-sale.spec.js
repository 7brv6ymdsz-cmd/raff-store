import { test, expect } from '../helpers/fixtures.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IMG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../helpers/product.png');

test('first sale without a server: checklist → setup → customer buys → order reaches the owner', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const PIN = '975310';
  const unlock = async (hash = '') => { await page.goto(`admin/${hash}`); await page.fill('#pin', PIN); await page.click('#lockSubmit'); await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 }); };

  await test.step('fresh admin shows the launch checklist with blocking items', async () => {
    await page.goto('admin/');
    await page.fill('#pin', PIN); await page.fill('#pin2', PIN); await page.click('#lockSubmit');
    await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.launch-card.blocked')).toBeVisible();
    await expect(page.locator('.launch-list li.crit')).toHaveCount(3); // demo products, first product, WhatsApp
  });

  await test.step('owner clears samples and adds a real product', async () => {
    await page.click('.launch-list [data-act="clear-demo-products"]');
    await page.click('#confirmOk');
    await page.locator('[data-act="new-product"]').first().click();
    await page.fill('#editor [name=name]', 'حقيبة جلد يدوية');
    await page.fill('#editor [name=store]', 'متجري');
    await page.fill('#editor [name=price]', '40');
    await page.click('#editor .type-seg label:has([value=physical])');
    await page.fill('#editor [name=stock]', '5');
    await page.setInputFiles('#imgIn', IMG);
    await expect(page.locator('.g-item')).toHaveCount(1);
    await page.click('#edSave');
    await expect(page.locator('.pc[data-product]')).toHaveCount(1);
  });

  await test.step('owner sets WhatsApp, payment and shipping', async () => {
    await page.goto('admin/#payments');
    await page.fill('[name=whatsapp]', '+962 79 555 0101');
    await page.fill('[name=fee]', '3');
    await page.fill('[name=freeOver]', '100');
    await page.click('#payForm [type=submit]');
    await expect(page.locator('#paySaved')).toHaveText(/محفوظ/);
    await page.goto('admin/#settings');
    await page.fill('[name=cEmail]', 'hello@mystore.com');
    await page.click('#setForm [type=submit]');
  });

  let storeJson;
  await test.step('owner publishes: checklist turns ready', async () => {
    await page.goto('admin/#publish');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="download"]')]);
    const st = await dl.createReadStream(); const parts = []; for await (const c of st) parts.push(c);
    storeJson = JSON.parse(Buffer.concat(parts).toString('utf8'));
    expect(storeJson.products).toHaveLength(1);
    expect(storeJson.settings.whatsapp).toBe('+962795550101');
    await page.click('[data-act="preview"]');
    await page.goto('admin/#dashboard');
    await expect(page.locator('.launch-card.ready')).toBeVisible();
    await expect(page.locator('.launch-list li.crit')).toHaveCount(0);
  });

  let order;
  await test.step('a customer buys the product', async () => {
    await page.goto('?preview=1');
    await page.evaluate(() => localStorage.removeItem('raff.myorders'));
    await page.locator('#picksRow .pcard-meta', { hasText: 'حقيبة جلد يدوية' }).click();
    await page.click('#pdBuyNow');
    await page.fill('[name=name]', 'زبون حقيقي'); await page.fill('[name=phone]', '0791112233');
    await page.fill('[name=city]', 'إربد'); await page.fill('[name=address]', 'شارع الجامعة، بناية ٧');
    await page.click('#checkoutForm [type=submit]');
    const wa = await page.locator('#doneBody a[href^="https://wa.me/"]').getAttribute('href');
    expect(wa).toContain('wa.me/962795550101');
    const text = decodeURIComponent(wa.split('text=')[1]);
    expect(text).toContain('حقيبة جلد يدوية');
    expect(text).toContain('المجموع: ٤٣$');      // 40 + 3 shipping
    expect(text).toMatch(/RAFF1\.[A-Za-z0-9_-]+/);
    order = text;
  });

  await test.step('the owner pastes the WhatsApp message and the order is in the admin with the right total', async () => {
    await unlock('#orders');
    // the same device already syncs it; also import from the message like on another phone
    await page.click('[data-act="import"]');
    await page.fill('#importText', order);
    await page.click('#importGo');
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr').first()).toContainText('زبون حقيقي');
    await expect(page.locator('tbody tr').first()).toContainText('٤٣$');
  });
  expect(errors).toEqual([]);
});
