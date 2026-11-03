import { test, expect } from '../helpers/fixtures.js';

test.beforeEach(async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#picksRow .pcard').first()).toBeVisible();
});

test('search understands Arabic spelling variants and sorts results', async ({ page }) => {
  await page.fill('#q', 'مزهريه');
  await expect(page.locator('#resultsGrid .pcard')).toHaveCount(1);
  await page.fill('#q', '');
  await page.locator('.pill').first().click();
  await page.selectOption('#sortSel', 'price-asc');
  const prices = await page.$$eval('#resultsGrid .pcard', (c) => c.map((x) => x.querySelector('.price').firstChild.textContent));
  const n = (s) => +s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace(/[^\d.]/g, '');
  const vals = prices.map(n);
  expect(vals.length).toBeGreaterThan(2);
  expect([...vals].sort((a, b) => a - b)).toEqual(vals);
  await page.fill('#q', 'zzzz');
  await expect(page.locator('#resultsEmpty')).toBeVisible();
});

test('a product with sizes cannot be added before choosing one', async ({ page }) => {
  await page.goto('#/p/14');
  await page.click('#pdBuy [type=submit]');
  await expect(page.locator('.opt-err:not([hidden])')).toBeVisible();
  await page.click('.opt-v:has-text("M")');
  await page.click('#pdBuy [type=submit]');
  await expect(page.locator('#cartBadge')).toHaveText('١');
  const ld = JSON.parse(await page.textContent('#ldjson'));
  expect(ld['@type']).toBe('Product');
});

test('checkout validates, places an order and the order can be tracked', async ({ page }) => {
  await page.goto('#/p/1');
  await page.click('#pdBuy [type=submit]');
  await page.click('[data-action="open-cart"]');
  await page.click('[data-inc]');
  await expect(page.locator('#cartBadge')).toHaveText('٢');
  await page.click('#cart [data-action="checkout"]');
  await page.click('#checkoutForm [type=submit]');
  await expect(page.locator('.field.invalid')).toBeVisible();
  await page.fill('[name=name]', 'فحص آلي');
  await page.fill('[name=phone]', '+962 79 123 4567');
  await page.fill('[name=city]', 'عمّان');
  await page.fill('[name=address]', 'شارع الجامعة ٥');
  await page.click('#checkoutForm [type=submit]');
  const id = (await page.locator('.done-id b').textContent()).trim();
  expect(id).toMatch(/^R-/);
  await page.click('#cart [data-action="close-cart"]');
  await page.goto(`#/track?id=${id}`);
  await page.fill('[name=phone]', '0000000');
  await page.click('#trackForm [type=submit]');
  await expect(page.locator('.form-err:not([hidden])')).toBeVisible();
  await page.fill('[name=phone]', '791234567');
  await page.click('#trackForm [type=submit]');
  await expect(page.locator('.timeline li')).toHaveCount(4);
});

test('wishlist keeps saved products', async ({ page }) => {
  await page.locator('#picksRow [data-save]').nth(0).click();
  await page.locator('#picksRow [data-save]').nth(1).click();
  await page.goto('#/wishlist');
  await expect(page.locator('#page .pcard')).toHaveCount(2);
});

test('footer links and the announcement bar open real pages', async ({ page }) => {
  const hrefs = await page.$$eval('.foot a[href^="#/"]', (a) => a.map((x) => x.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(8);
  for (const h of hrefs) {
    await page.goto(h);
    await expect(page.locator('#page h1').first(), h).toBeVisible();
  }
  await page.goto('');
  await page.click('a.banner');
  await expect(page).toHaveURL(/#\/shipping$/);
});
