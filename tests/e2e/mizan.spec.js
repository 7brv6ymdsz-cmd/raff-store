import { test, expect, useFixture } from '../helpers/fixtures.js';
import { makeMock, attachMock } from '../helpers/supabase-mock.js';

// Mizan (#/mizan) opens only with an active subscription. The page reflects the database's lock;
// the lock itself (row-level security) is tested on PostgreSQL in tests/db/60-subscriptions-mizan.sql.
const PLANS = [
  { id: 'pro', name: 'احترافي', price: 119, features: ['ميزان كامل'], checkoutUrl: 'https://store.example/checkout/pro' },
  { id: 'business', name: 'أعمال', price: 249, features: ['حتى ٥ مشاريع'], checkoutUrl: '' },
];

test('without a server, Mizan explains it opens with the subscription and shows the plans', async ({ page }) => {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/mizan');
  await expect(page.locator('.mz-lock h1')).toHaveText('ميزان للمشتركين');
  await expect(page.locator('.mz-plan-card')).toHaveCount(2);
  await expect(page.locator('[data-mz-checkout]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Mizan: locked → subscribed → every section works → locks again when the plan ends, data kept @mobile', async ({ browser }, info) => {
  test.setTimeout(120_000);
  const errors = [];
  const mock = makeMock();
  mock.db.settings[0].data.billing = { plans: PLANS };
  const viewport = info.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 860 };
  const ctx = await browser.newContext({ viewport }); await useFixture(ctx); await attachMock(ctx, mock);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  const email = `amal${info.project.name}@test.com`;

  await test.step('signed out: asked to sign in', async () => {
    await page.goto('#/mizan');
    await expect(page.locator('.mz-lock a[href="#/login?next=mizan"]')).toBeVisible();
  });

  await test.step('new account comes back to Mizan, locked, with a checkout link that carries the account', async () => {
    await page.goto('#/signup?next=mizan');
    await page.fill('[name=name]', 'أمل'); await page.fill('[name=email]', email);
    await page.fill('[name=phone]', '+962 79 111 2222'); await page.fill('[name=password]', 'Amal-pass-2026!');
    await page.check('[name=terms]');
    await page.click('#signupForm [type=submit]');
    await expect(page).toHaveURL(/#\/mizan$/);
    await expect(page.locator('.mz-lock h1')).toHaveText('ميزان مقفول');
    const uid = mock.users.find((u) => u.email === email).id;
    const href = await page.locator('[data-mz-checkout="pro"]').getAttribute('href');
    const u = new URL(href);
    expect(u.origin + u.pathname).toBe('https://store.example/checkout/pro');
    expect(u.searchParams.get('checkout[email]')).toBe(email);
    expect(u.searchParams.get('checkout[custom][user_id]')).toBe(uid);
    await expect(page.locator('.mz-plan-card').nth(1)).toContainText('بيفتح قريباً'); // no checkout link set for this plan
    // writing without a plan is refused by the server
    expect(mock.db.mizan_entries).toHaveLength(0);
  });

  await test.step('the payment arrives: the member re-checks and Mizan opens', async () => {
    const uid = mock.users.find((x) => x.email === email).id;
    mock.db.subscriptions.push({ user_id: uid, plan: 'pro', status: 'active', current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(), provider: 'lemonsqueezy', manage_url: 'https://store.example/portal', updated_at: new Date().toISOString() });
    await page.click('[data-mz-recheck]');
    await expect(page.locator('.mz-head')).toContainText('احترافي');
    await expect(page.locator('.mz-sub a[href="https://store.example/portal"]')).toBeVisible();
  });

  await test.step('settings, entries and the dashboard', async () => {
    await page.goto('#/mizan/settings');
    await page.fill('#mzSet [name=business]', 'استوديو أمل');
    await page.fill('#mzSet [name=goal]', '1000');
    await page.click('#mzSet [type=submit]');
    await expect(page.locator('.mz-head h1')).toHaveText('استوديو أمل');
    await expect.poll(() => (mock.db.mizan_books[0] || {}).settings?.business).toBe('استوديو أمل');

    await page.goto('#/mizan/entries');
    await page.fill('#mzEntry [name=amount]', '500');
    await page.fill('#mzEntry [name=description]', 'تصميم هوية');
    await page.click('#mzEntry [type=submit]');
    await expect(page.locator('.mz-table tbody tr')).toHaveCount(1);
    await page.selectOption('#mzEntry [name=kind]', 'expense');
    await expect(page.locator('#mzEntry [name=category] option').first()).toHaveText('مواد وتكلفة بضاعة');
    await page.fill('#mzEntry [name=amount]', '١٢٠'); // Arabic digits are accepted
    await page.click('#mzEntry [type=submit]');
    await expect(page.locator('.mz-table tbody tr')).toHaveCount(2);
    await expect(page.locator('.mz-sum')).toContainText('٣٨٠');
    expect(mock.db.mizan_entries.map((e) => [e.kind, e.amount])).toEqual(expect.arrayContaining([['income', 500], ['expense', 120]]));

    await page.goto('#/mizan');
    await expect(page.locator('.mz-k.pos b')).toContainText('٣٨٠');
    await expect(page.locator('.mz-bars')).toBeVisible();
    await expect(page.locator('.mz-goal')).toContainText('٥٠٠');
  });

  await test.step('clients, an invoice with tax, printing it and booking it as income', async () => {
    await page.goto('#/mizan/clients');
    await page.fill('#mzClient [name=name]', 'شركة الأفق');
    await page.fill('#mzClient [name=email]', 'info@ofoq.example');
    await page.click('#mzClient [type=submit]');
    await expect(page.locator('.mz-table tbody tr')).toHaveCount(1);

    await page.goto('#/mizan/invoices');
    await page.click('[data-mz-newinv]');
    await page.fill('#mzInv [name=client]', 'شركة الأفق');
    await page.fill('#mzInv .it-d', 'تصميم شعار');
    await page.fill('#mzInv .it-p', '450');
    await page.fill('#mzInv [name=tax]', '16');
    await expect(page.locator('#mzInvSum')).toContainText('٥٢٢');
    await page.click('#mzInv [type=submit]');
    await expect(page.locator('.mz-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.mz-table tbody')).toContainText(`INV-${new Date().getFullYear()}-001`);

    await page.evaluate(() => { window.printed = 0; window.print = () => { window.printed += 1; }; });
    await page.click('[data-mz-print]');
    expect(await page.evaluate(() => window.printed)).toBe(1);
    await expect(page.locator('#mzPrint')).toContainText('info@ofoq.example');
    await page.click('[data-mz-income]');
    await expect.poll(() => mock.db.mizan_entries.length).toBe(3);
  });

  await test.step('the account page shows the plan', async () => {
    await page.goto('#/account');
    await expect(page.locator('.acc-sub')).toContainText('افتح ميزان');
  });

  await test.step('the plan expires: the next save is refused, Mizan locks, nothing is lost', async () => {
    await page.goto('#/mizan/entries');
    const s = mock.db.subscriptions[0];
    Object.assign(s, { status: 'expired', current_period_end: new Date(Date.now() - 60000).toISOString() });
    await page.fill('#mzEntry [name=amount]', '75');
    await page.click('#mzEntry [type=submit]');
    await expect(page.locator('.mz-lock h1')).toHaveText('ميزان مقفول');
    await expect(page.locator('.mz-lock')).toContainText('بياناتك محفوظة');
    expect(mock.db.mizan_entries).toHaveLength(3);
    await page.reload();
    await expect(page.locator('.mz-lock h1')).toHaveText('ميزان مقفول');
  });

  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
  await ctx.close();
});
