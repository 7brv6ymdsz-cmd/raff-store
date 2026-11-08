import { test, expect, useFixture } from '../helpers/fixtures.js';
import { makeMock, attachMock } from '../helpers/supabase-mock.js';

// The owner manages monthly members: grants a plan (Mizan opens for that member), ends it (Mizan locks), and sets plan prices.
test('owner grants and ends a membership; the member sees Mizan open and then locked', async ({ browser }) => {
  test.setTimeout(120_000);
  const mock = makeMock();
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 860 } }); await useFixture(ctxA); await attachMock(ctxA, mock);
  const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } }); await useFixture(ctxB); await attachMock(ctxB, mock);
  const admin = await ctxA.newPage(), member = await ctxB.newPage();
  const errors = []; admin.on('pageerror', (e) => errors.push(e.message)); member.on('pageerror', (e) => errors.push(e.message));

  await admin.goto('admin/');
  await admin.fill('#cEmail', 'owner@shop.test'); await admin.fill('#cPass', 'Owner-pass-123');
  await admin.click('#lockSubmit');
  await expect(admin.locator('#app')).toBeVisible();

  await test.step('plan prices and the checkout link are saved with the settings', async () => {
    await admin.goto('admin/#settings');
    await admin.fill('[name=bPrice0]', '129');
    await admin.fill('[name=bUrl0]', 'http://not-secure.example');
    await admin.click('#setForm [type=submit]');
    await expect(admin.locator('#toast')).toContainText('https://');
    await admin.fill('[name=bUrl0]', 'https://rawaj.lemonsqueezy.com/checkout/buy/abc');
    await admin.fill('[name=bFeat0]', 'ميزان كامل\nمشروع واحد');
    await admin.click('#setForm [type=submit]');
    await expect.poll(() => (mock.db.settings[0].data.billing || {}).plans?.[0]?.price).toBe(129);
    expect(mock.db.settings[0].data.billing.plans[0]).toMatchObject({ id: 'pro', checkoutUrl: 'https://rawaj.lemonsqueezy.com/checkout/buy/abc', features: ['ميزان كامل', 'مشروع واحد'] });
  });

  await test.step('a member signs up; the owner grants 30 days', async () => {
    await member.goto('#/signup?next=mizan');
    await member.fill('[name=name]', 'رامي'); await member.fill('[name=email]', 'rami@test.com');
    await member.fill('[name=phone]', '+962 79 333 4444'); await member.fill('[name=password]', 'Rami-pass-2026!');
    await member.check('[name=terms]'); await member.click('#signupForm [type=submit]');
    await expect(member.locator('.mz-lock h1')).toHaveText('ميزان مقفول');
    await expect(member.locator('.mz-plan-card').first()).toContainText('١٢٩');

    await admin.goto('admin/#members');
    await expect(admin.locator('#view')).toContainText('ما في مشتركين لسا');
    await admin.fill('#subForm [name=email]', 'rami@test.com');
    await admin.fill('#subForm [name=days]', '30');
    await admin.click('#subForm [type=submit]');
    await expect(admin.locator('.table tbody tr')).toHaveCount(1);
    await expect(admin.locator('.table tbody')).toContainText('فعّال');

    await member.click('[data-mz-recheck]');
    await expect(member.locator('.mz-head')).toBeVisible();
  });

  await test.step('the owner ends it: Mizan locks for the member', async () => {
    await admin.click('[data-endsub]');
    await admin.click('#confirmOk');
    await expect(admin.locator('.table tbody')).toContainText('منتهي');
    await member.goto('#/account');
    await member.goto('#/mizan');
    await member.evaluate(() => window.raffMizan.reset());
    await member.reload();
    await expect(member.locator('.mz-lock h1')).toHaveText('ميزان مقفول');
  });
  expect(errors).toEqual([]);
  await ctxA.close(); await ctxB.close();
});

test('a member suspended for breaking the halal policy loses Mizan until the owner lifts it; the server refuses haram products', async ({ browser }) => {
  test.setTimeout(120_000);
  const mock = makeMock();
  const ctxA = await browser.newContext(); await useFixture(ctxA); await attachMock(ctxA, mock);
  const ctxB = await browser.newContext(); await useFixture(ctxB); await attachMock(ctxB, mock);
  const admin = await ctxA.newPage(), member = await ctxB.newPage();
  await admin.goto('admin/');
  await admin.fill('#cEmail', 'owner@shop.test'); await admin.fill('#cPass', 'Owner-pass-123');
  await admin.click('#lockSubmit');
  await expect(admin.locator('#app')).toBeVisible();

  await member.goto('#/signup?next=mizan');
  await expect(member.locator('label.check a[href="#/halal"]')).toBeVisible(); // agreeing to the halal policy is part of signing up
  await member.fill('[name=name]', 'سامر'); await member.fill('[name=email]', 'samer@test.com');
  await member.fill('[name=phone]', '+962 79 555 6666'); await member.fill('[name=password]', 'Samer-pass-2026!');
  await member.check('[name=terms]'); await member.click('#signupForm [type=submit]');
  await expect(member.locator('.mz-lock h1')).toHaveText('ميزان مقفول');

  await admin.goto('admin/#members');
  await admin.fill('#subForm [name=email]', 'samer@test.com');
  await admin.click('#subForm [type=submit]');
  await expect(admin.locator('.table tbody')).toContainText('فعّال');
  admin.once('dialog', (d) => d.accept('إعلانات قمار'));
  await admin.click('[data-block]');
  await expect(admin.locator('.table tbody')).toContainText('موقوف لمخالفة');

  await member.click('[data-mz-recheck]');
  await expect(member.locator('.mz-lock h1')).toHaveText('الحساب موقوف');
  await expect(member.locator('.mz-lock')).toContainText('إعلانات قمار');
  await expect(member.locator('.mz-plan-card')).toHaveCount(0);

  await admin.click('[data-unblock]');
  await expect(admin.locator('.table tbody')).toContainText('فعّال');
  await member.reload();
  await expect(member.locator('.mz-head')).toBeVisible();

  // the server's own screen (cloud mode): a product saved around the browser check is refused with the halal message
  const res = await admin.evaluate(async () => { const { error } = await window.RaffData.client.from('products').insert({ name: 'كازينو أونلاين', price: 1 }).select(); return error ? error.message : 'saved'; });
  expect(res).toContain('halal_blocked');
  const msg = await admin.evaluate(() => window.RaffData.friendly({ message: 'halal_blocked:gambling' }));
  expect(msg).toContain('القمار');
  await ctxA.close(); await ctxB.close();
});
