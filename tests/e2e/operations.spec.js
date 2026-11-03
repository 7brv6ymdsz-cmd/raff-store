import { test, expect, useFixture } from '../helpers/fixtures.js';
import { makeMock, attachMock } from '../helpers/supabase-mock.js';

test('roles, inventory movements, low-stock alerts and the activity log (server mode)', async ({ browser }) => {
  test.setTimeout(150_000);
  const mock = makeMock();
  const page = async () => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } }); await useFixture(ctx); await attachMock(ctx, mock); return ctx.newPage(); };
  const owner = await page();

  await test.step('owner signs in and sees every section', async () => {
    await owner.goto('admin/');
    await owner.fill('#cEmail', 'owner@shop.test'); await owner.fill('#cPass', 'Owner-pass-123');
    await owner.click('#lockSubmit');
    await expect(owner.locator('#sideNav a[href="#team"]')).toBeVisible();
    await expect(owner.locator('#sideNav a[href="#activity"]')).toBeVisible();
  });

  await test.step('a support agent with an account is added to the team', async () => {
    const agent = await page();
    await agent.goto('#/signup');
    await agent.fill('[name=name]', 'ريم'); await agent.fill('[name=email]', 'reem@shop.test'); await agent.fill('[name=password]', 'Reem-pass-2026!');
    await agent.check('[name=terms]'); await agent.click('#signupForm [type=submit]');
    await expect(agent).toHaveURL(/#\/account$/);
    await owner.goto('admin/#team');
    await owner.fill('#staffForm [name=email]', 'reem@shop.test');
    await owner.selectOption('#staffForm [name=role]', 'support');
    await owner.click('#staffForm [type=submit]');
    await expect(owner.locator('.role-sel[data-staff="reem@shop.test"]')).toHaveValue('support');

    await agent.goto('admin/');
    await expect(agent.locator('#app')).toBeVisible();
    await expect(agent.locator('#roleBadge')).toHaveText('خدمة عملاء');
    await expect(agent.locator('#sideNav a[href="#orders"]')).toBeVisible();
    await expect(agent.locator('#sideNav a[href="#messages"]')).toBeVisible();
    for (const hidden of ['#products', '#inventory', '#coupons', '#settings', '#team', '#activity', '#payments']) await expect(agent.locator(`#sideNav a[href="${hidden}"]`)).toHaveCount(0);
    await agent.goto('admin/#settings');
    await expect(agent.locator('#topTitle')).toHaveText('الرئيسية');
    // and the server refuses even if the page is bypassed
    const r = await agent.evaluate(async () => (await window.RaffData.client.rpc('adjust_stock', { p_product: 1, p_delta: 5, p_reason: 'restock' })).error?.message);
    expect(r).toBe('not_allowed');
  });

  await test.step('owner restocks, counts and records damage; history keeps every reason', async () => {
    await owner.goto('admin/#inventory/1');
    await owner.selectOption('#invForm [name=reason]', 'restock');
    await owner.fill('#invForm [name=qty]', '10'); await owner.fill('#invForm [name=note]', 'فاتورة ٢٣٤');
    await owner.click('#invForm [type=submit]');
    await expect(owner.locator('.movs li').first()).toContainText('توريد بضاعة');
    const before = mock.db.products.find((p) => p.id === 1).stock;
    await owner.selectOption('#invForm [name=reason]', 'count');
    await owner.fill('#invForm [name=qty]', '3');
    await owner.click('#invForm [type=submit]');
    await expect.poll(() => mock.db.products.find((p) => p.id === 1).stock).toBe(3);
    expect(mock.db.stock_movements.map((m) => m.reason)).toEqual(['restock', 'count']);
    expect(mock.db.stock_movements[1].delta).toBe(3 - before);
  });

  await test.step('crossing the threshold raises one alert, shown in the bell', async () => {
    expect(mock.db.admin_notifications).toHaveLength(1);
    await owner.goto('admin/');
    await owner.click('[data-act="reload"]').catch(() => {});
    await owner.reload();
    await expect(owner.locator('#bellCount')).toHaveText('١');
    await owner.click('#bellBtn');
    await expect(owner.locator('.notes li').first()).toContainText('المخزون قليل');
    await expect.poll(() => mock.db.admin_notifications[0].read).toBe(true);
  });

  await test.step('price change by the owner appears in the activity log with before/after', async () => {
    await owner.goto('admin/#products/2');
    await owner.fill('#editor [name=price]', '95');
    await owner.click('#edSave');
    await expect.poll(() => mock.db.products.find((p) => p.id === 2).price).toBe(95);
    await owner.goto('admin/#activity');
    await expect(owner.locator('.audit li').first()).toContainText('owner@shop.test');
    await expect(owner.locator('.audit-diff').first()).toContainText('السعر');
  });
});

test('inventory page without a server: filters and quick adjustments', async ({ page }) => {
  await page.goto('admin/');
  await page.fill('#pin', '112233'); await page.fill('#pin2', '112233');
  await page.click('#lockSubmit');
  await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('#sideNav a[href="#team"]')).toHaveCount(0);
  await page.goto('admin/#inventory');
  const row = page.locator('tr[data-stock="1"]');
  const q = async () => row.locator('.inv-qty').textContent();
  const before = await q();
  await row.locator('[data-qadj="1"]').click();
  await expect(row.locator('.inv-qty')).not.toHaveText(before);
  await page.click('[data-invf="low"] >> nth=0');
  await expect(page.locator('#invList')).toBeVisible();
});
