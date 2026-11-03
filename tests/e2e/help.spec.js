import { test, expect } from '../helpers/fixtures.js';

test('instant answers find the right topic from everyday wording @mobile', async ({ page }) => {
  await page.goto('');
  await page.click('.help-fab');
  await expect(page.locator('#helpPanel')).toBeVisible();
  const cases = [['بدي ارجع المنتج كيف؟', 'رجّع'], ['قديش بياخد التوصيل', 'التوصيل'], ['فيني ادفع بالفيزا؟', 'ادفع'], ['وين صار طلبي', 'طلبي'], ['عندكم كود خصم', 'كود']];
  for (const [q, expected] of cases) {
    await page.fill('#helpQ', q);
    await expect(page.locator('.help-ans').first().locator('summary'), q).toContainText(expected);
  }
  await page.fill('#helpQ', 'سماعات');
  await expect(page.locator('.help-ans summary', { hasText: 'سماعات' })).toBeVisible();
});

test('without a server, "ask the team" opens a ready WhatsApp/email message or explains', async ({ page }) => {
  await page.goto('');
  await page.evaluate(() => { window.__opened = []; window.open = (u) => window.__opened.push(u); });
  await page.click('.help-fab');
  await page.click('[data-compose]');
  await page.click('.help-send');
  await expect(page.locator('.help-err')).toBeVisible();
  await page.fill('.help-form [name=name]', 'زائر');
  await page.fill('.help-form [name=body]', 'عندي سؤال عن المقاسات');
  await page.click('.help-send');
  const opened = await page.evaluate(() => window.__opened);
  const err = await page.locator('.help-err').textContent();
  expect(opened.length > 0 || /وسيلة تواصل/.test(err)).toBeTruthy();
});

test('product page offers to ask about the product', async ({ page }) => {
  await page.goto('#/p/6');
  await page.click('[data-ask-product]');
  await expect(page.locator('#helpTitle')).toContainText('سماعات');
});
