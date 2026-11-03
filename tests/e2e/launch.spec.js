import { test, expect } from '../helpers/fixtures.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const IMG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../helpers/product.png');

test('launch: clear the sample products, add a real product with a photo, store shows only it @mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('admin/');
  await page.fill('#pin', '864213'); await page.fill('#pin2', '864213');
  await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });

  await expect(page.locator('.launch-card.blocked')).toBeVisible();
  await page.click('.launch-card [data-act="clear-demo-products"]');
  await page.click('#confirmOk');
  await expect(page).toHaveURL(/#products$/);
  await expect(page.locator('.pc[data-product]')).toHaveCount(0);

  // the empty store still looks right
  await page.goto('admin/#publish');
  await page.click('[data-act="preview"]');
  await page.goto('?preview=1');
  await expect(page.locator('#sections')).toContainText('ما في منتجات');
  await expect(page.locator('.wordmark')).toBeVisible();

  // first real product, with a photo and sizes (the admin locks again after leaving it)
  const unlock = async (hash) => { await page.goto(`admin/${hash}`); await page.fill('#pin', '864213'); await page.click('#lockSubmit'); await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 }); };
  await unlock('#products');
  await page.locator('[data-act="new-product"]').first().click();
  await page.fill('#editor [name=name]', 'فستان صيفي');
  await page.fill('#editor [name=store]', 'متجري');
  await page.fill('#editor [name=price]', '35');
  await page.click('#editor .type-seg label:has([value=physical])');
  await page.fill('#editor [name=stock]', '12');
  await page.setInputFiles('#imgIn', IMG);
  await expect(page.locator('.g-item')).toHaveCount(1);
  await page.click('#optAdd');
  await page.fill('.opt-name', 'المقاس'); await page.fill('.opt-vals', 'S، M، L');
  await page.click('#edSave');
  await expect(page.locator('.pc[data-product]')).toHaveCount(1);

  await page.goto('admin/#publish');
  await expect(page.locator('[data-act="preview"]')).toBeVisible();
  await page.click('[data-act="preview"]');
  await page.goto('?preview=1');
  await expect(page.locator('.pcard h3:visible', { hasText: 'فستان صيفي' }).first()).toBeVisible();
  await expect(page.locator('.float:visible')).toHaveCount(1);
  await expect(page.locator('.pcard img').first()).toBeVisible();
  expect(await page.locator('.pcard h3').evaluateAll((h) => h.map((x) => x.textContent).filter((t) => t !== 'فستان صيفي'))).toEqual([]);
  const id = await page.evaluate(() => [...window.raff.byId.values()][0].id);
  await page.goto(`?preview=1#/p/${id}`);
  await expect(page.locator('.pd-name')).toHaveText('فستان صيفي');
  await expect(page.locator('.opt-v')).toHaveCount(3);
  expect(errors).toEqual([]);
});
