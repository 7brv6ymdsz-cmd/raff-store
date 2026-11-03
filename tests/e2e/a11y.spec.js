import { test, expect } from '../helpers/fixtures.js';
import AxeBuilder from '@axe-core/playwright';

for (const path of ['', '#/p/14', '#/faq', '#/contact', '#/track', '#/login', 'admin/']) {
  test(`no serious accessibility problems: /${path || 'home'}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0].target.join(' ')}`)).toEqual([]);
  });
}

test('help widget is keyboard and screen-reader friendly', async ({ page }) => {
  await page.goto('');
  await page.focus('.help-fab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.help-fab')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#helpQ')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.help-fab')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#helpPanel')).toHaveAttribute('inert', '');
});
