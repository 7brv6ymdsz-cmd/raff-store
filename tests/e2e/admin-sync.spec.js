import { test, expect } from '../helpers/fixtures.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const serve = (page, file, updated) => page.route('**/data/store.json*', (route) => {
  const d = JSON.parse(fs.readFileSync(path.join(FX, file), 'utf8')); d.updated = updated;
  return route.fulfill({ body: JSON.stringify(d), contentType: 'application/json' });
});

test('admin opened earlier picks up a newer published store, and asks first when it has unpublished edits', async ({ page }) => {
  const PIN = '246800';
  const unlock = async (first) => {
    await page.goto('admin/');
    await page.fill('#pin', PIN); if (first) await page.fill('#pin2', PIN);
    await page.click('#lockSubmit');
    await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  };
  await serve(page, 'store.json', '2026-11-01T00:00:00Z');
  await unlock(true);
  await page.goto('admin/#products');
  const oldCount = await page.locator('.pc[data-product]').count();

  // a newer store is published (e.g. from GitHub): the admin takes it over by itself
  await page.unroute('**/data/store.json*');
  await serve(page, 'digital.json', '2026-11-03T00:00:00Z');
  await unlock(false);
  await expect(page.locator('#toast')).toContainText('آخر نسخة منشورة');
  await page.goto('admin/#products');
  await expect(page.locator('.pc[data-product]')).toHaveCount(12);
  expect(oldCount).not.toBe(12);
  await expect(page.locator('#publishDot')).toBeHidden();

  // with unpublished edits, it does not overwrite silently
  await page.goto('admin/#payments');
  await page.fill('[name=whatsapp]', '+962 79 111 2222');
  await page.click('#payForm [type=submit]');
  await page.unroute('**/data/store.json*');
  await serve(page, 'store.json', '2026-11-05T00:00:00Z');
  await unlock(false);
  await page.goto('admin/#dashboard');
  await expect(page.locator('[data-act="adopt-published"]')).toBeVisible();
  await page.goto('admin/#products');
  await expect(page.locator('.pc[data-product]')).toHaveCount(12);
  await page.goto('admin/#dashboard');
  await page.click('[data-act="adopt-published"]');
  await page.click('#confirmOk');
  await page.goto('admin/#products');
  await expect(page.locator('.pc[data-product]')).toHaveCount(oldCount);
});
