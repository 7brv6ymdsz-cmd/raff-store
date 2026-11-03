import { test, expect } from '../helpers/fixtures.js';

const readDownload = async (dl) => { const st = await dl.createReadStream(); const parts = []; for await (const c of st) parts.push(c); return Buffer.concat(parts).toString('utf8'); };

test('admin without a server: PIN, product with options, coupon, settings, CSV and publish file', async ({ page }) => {
  // a customer order placed on this device first
  await page.goto('#/p/1');
  await page.click('#pdBuy [type=submit]');
  await page.click('[data-action="open-cart"]');
  await page.click('#cart [data-action="checkout"]');
  await page.fill('[name=name]', 'زبون'); await page.fill('[name=phone]', '+96170123456'); await page.fill('[name=city]', 'بيروت'); await page.fill('[name=address]', 'الحمرا ١');
  await page.click('#checkoutForm [type=submit]');
  await expect(page.locator('.done-id b')).toBeVisible();

  await page.goto('admin/');
  await page.fill('#pin', '246810'); await page.fill('#pin2', '246810');
  await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#sideNav a[href="#orders"] em')).toHaveText('١');

  await page.goto('admin/#settings');
  await page.fill('[name=cInstagram]', 'javascript:alert(1)');
  await page.click('#setForm [type=submit]');
  await expect(page.locator('#toast')).toContainText('https');
  await page.fill('[name=cInstagram]', 'https://instagram.com/raff');
  await page.fill('[name=pAbout]', 'رَفّ متجر صغير من عمّان.');
  await page.click('#setForm [type=submit]');

  await page.goto('admin/#products');
  await page.locator('[data-act="new-product"]').first().click();
  await page.fill('#editor [name=name]', 'منتج الاختبار');
  await page.fill('#editor [name=price]', '9');
  await page.click('#optAdd');
  await page.fill('.opt-name', 'اللون'); await page.fill('.opt-vals', 'أخضر، بني');
  await page.click('#edSave');

  await page.goto('admin/#coupons');
  await page.locator('[data-act="new-coupon"]').first().click();
  await page.fill('#cpForm [name=code]', 'TEST10'); await page.fill('#cpForm [name=value]', '10');
  await page.click('#cpForm [type=submit]');
  await expect(page.locator('.coupon-card')).toHaveCount(1);

  await page.goto('admin/#orders');
  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="csv-orders"]')]);
  const csv = await readDownload(csvDl);
  expect(csv).toContain('"order","date"');
  expect(csv.trim().split('\n').length).toBe(2);

  await page.goto('admin/#publish');
  const [pub] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="download"]')]);
  const json = JSON.parse(await readDownload(pub));
  expect(json.products.find((p) => p.name === 'منتج الاختبار').options[0].values).toEqual(['أخضر', 'بني']);
  expect(JSON.stringify(json)).not.toContain('TEST10');
  expect(JSON.stringify(json)).not.toContain('+96170123456');
  expect(json.settings.contact.instagram).toBe('https://instagram.com/raff');

  await page.click('[data-act="preview"]');
  await page.goto('?preview=1#/about');
  await expect(page.locator('#page')).toContainText('من عمّان');
  await expect(page.locator('.foot .socials a[href="https://instagram.com/raff"]')).toBeVisible();
});
