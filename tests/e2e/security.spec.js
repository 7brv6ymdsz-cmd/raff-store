import { test, expect } from '../helpers/fixtures.js';

test('a malicious product name is shown as text and never runs', async ({ page }) => {
  await page.goto('admin/');
  await page.fill('#pin', '135790'); await page.fill('#pin2', '135790');
  await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  await page.goto('admin/#products');
  await page.locator('[data-act="new-product"]').first().click();
  const evil = '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script>';
  await page.fill('#editor [name=name]', evil.slice(0, 80));
  await page.fill('#editor [name=desc]', evil);
  await page.fill('#editor [name=price]', '1');
  await page.click('#edSave');
  expect(await page.evaluate(() => window.__pwned)).toBeFalsy();
  await page.goto('admin/#publish');
  await page.click('[data-act="preview"]');
  await page.goto('?preview=1');
  await expect(page.locator('#picksRow .pcard').first()).toBeVisible();
  const id = await page.evaluate(() => [...window.raff.byId.values()].find((x) => x.name.includes('onerror')).id);
  await page.fill('#q', 'onerror');
  await page.goto(`?preview=1#/p/${id}`);
  await expect(page.locator('.pd-name')).toContainText('<img');
  expect(await page.evaluate(() => window.__pwned)).toBeFalsy();
});

test('pages ship a strict Content-Security-Policy', async ({ page }) => {
  for (const p of ['', 'admin/']) {
    await page.goto(p);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("object-src 'none'");
  }
});
