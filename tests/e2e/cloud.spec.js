import { test, expect, useFixture } from '../helpers/fixtures.js';
import { makeMock, attachMock } from '../helpers/supabase-mock.js';

test.describe.configure({ mode: 'serial' });

test('server mode: accounts, orders, coupons, reviews, answer system and account deletion', async ({ browser }) => {
  test.setTimeout(180_000);
  const mock = makeMock();
  const newPage = async (viewport = { width: 1366, height: 860 }) => { const ctx = await browser.newContext({ viewport }); await useFixture(ctx); await attachMock(ctx, mock); return ctx.newPage(); };
  const admin = await newPage();
  const shop = await newPage();

  await test.step('first account on the admin page becomes the owner', async () => {
    await admin.goto('admin/');
    await admin.fill('#cEmail', 'owner@shop.test'); await admin.fill('#cPass', 'Owner-pass-123');
    await admin.click('#lockSubmit');
    await expect(admin.locator('#app')).toBeVisible();
    await expect(admin.locator('#cloudBadge')).toBeVisible();
    expect(mock.db.admins).toHaveLength(1);
  });

  await test.step('admin creates a coupon', async () => {
    await admin.goto('admin/#coupons');
    await admin.locator('[data-act="new-coupon"]').first().click();
    await admin.fill('#cpForm [name=code]', 'save20'); await admin.fill('#cpForm [name=value]', '20');
    await admin.click('#cpForm [type=submit]');
    await expect.poll(() => mock.db.coupons.map((c) => c.code)).toContain('SAVE20');
  });

  await test.step('customer signs up and lands on the account', async () => {
    await shop.goto('#/signup');
    await shop.fill('[name=name]', 'سارة أحمد'); await shop.fill('[name=email]', 'sara@test.com');
    await shop.fill('[name=phone]', '+961 70 123 456'); await shop.fill('[name=password]', 'Sara-pass-2026!');
    await shop.check('[name=terms]');
    await shop.click('#signupForm [type=submit]');
    await expect(shop).toHaveURL(/#\/account$/);
    await expect(shop.locator('#acctPillText')).toContainText('سارة');
  });

  let orderId;
  await test.step('order with a size and a coupon is priced on the server', async () => {
    await shop.goto('#/p/14');
    await shop.click('.opt-v:has-text("M")');
    await shop.click('#pdBuyNow');
    await expect(shop.locator('[name=name]')).toHaveValue('سارة أحمد');
    await shop.fill('[name=city]', 'بيروت'); await shop.fill('[name=address]', 'الحمرا، شارع بلس ٤');
    await shop.fill('[name=coupon]', 'SAVE20'); await shop.click('[data-action="apply-coupon"]');
    await expect(shop.locator('#couponMsg')).toContainText('وفّرت');
    await shop.click('#checkoutForm [type=submit]');
    orderId = (await shop.locator('.done-id b').textContent()).trim();
    const o = mock.db.orders.find((x) => x.id === orderId);
    expect(o.discount).toBeCloseTo(o.subtotal * 0.2, 2);
    expect(o.items[0].options).toEqual({ المقاس: 'M' });
    expect(o.user_id).toBeTruthy();
  });

  await test.step('admin sees the order and marks it delivered', async () => {
    await admin.goto('admin/#orders');
    await admin.click('[data-act="reload"]');
    await admin.locator(`tr[data-order="${orderId}"]`).click();
    await admin.click('#sheet [data-status="delivered"]');
    await expect.poll(() => mock.db.orders.find((x) => x.id === orderId).status).toBe('delivered');
  });

  await test.step('review form stays hidden until the order is delivered', async () => {
    await shop.click('#cart [data-action="close-cart"]');
    await expect(shop.locator('#rvForm')).toBeHidden();
  });

  await test.step('buyer reviews, admin approves, rating updates', async () => {
    await shop.goto('#/p/14');
    await shop.reload();
    await shop.click('#rvOpen');
    await shop.click('label[for=rv5]');
    await shop.fill('#rvForm textarea', 'القماش ممتاز');
    await shop.click('#rvForm [type=submit]');
    await expect.poll(() => mock.db.reviews.length).toBe(1);
    expect(mock.db.reviews[0].status).toBe('pending');
    await admin.goto('admin/#reviews'); await admin.click('[data-act="reload"]');
    await admin.click('[data-rv][data-to="approved"]');
    await expect.poll(() => mock.db.products.find((p) => p.id === 14).rating).toBe(5);
  });

  let convId;
  await test.step('guest asks through the help widget with an instant answer attached', async () => {
    const guest = await newPage({ width: 390, height: 844 });
    await guest.goto('');
    await guest.click('.help-fab');
    await guest.fill('#helpQ', 'قديش التوصيل');
    await expect(guest.locator('.help-ans').first()).toContainText('التوصيل');
    await guest.click('[data-compose-q]');
    await guest.fill('.help-form [name=name]', 'زائر');
    await guest.fill('.help-form [name=contact]', '+961 71 000 111');
    await guest.click('.help-send');
    await expect(guest.locator('.help-msgs li')).toHaveCount(2);
    convId = mock.db.conversations[0].id;
    expect(mock.db.conversation_messages.map((m) => m.sender)).toEqual(['bot', 'customer']);
    test.info().annotations.push({ type: 'guest', description: 'kept page' });
    shop.__guest = guest;
  });

  await test.step('admin inbox shows it unread, admin replies with a quick reply', async () => {
    await admin.goto('admin/#messages');
    await admin.click('[data-act="reload"]');
    await expect(admin.locator('#sideNav a[href="#messages"] em')).toHaveText('١');
    await admin.locator(`[data-conv="${convId}"]`).click();
    await admin.click('[data-quick="2"]');
    await admin.click('#convForm button[type=submit]');
    await expect.poll(() => mock.db.conversations[0].status).toBe('answered');
    expect(mock.db.conversation_messages.at(-1).sender).toBe('admin');
  });

  await test.step('guest sees the reply and answers back', async () => {
    const guest = shop.__guest;
    await guest.reload();
    await expect(guest.locator('.help-dot')).toBeVisible();
    await guest.click('.help-fab');
    await guest.locator(`[data-thread="${convId}"]`).click();
    await expect(guest.locator('.help-msgs .m-admin')).toContainText('انشحن');
    await guest.fill('#helpReply', 'شكراً!');
    await guest.press('#helpReply', 'Enter');
    await expect(guest.locator('.help-msgs .m-customer').last()).toContainText('شكراً');
    expect(mock.db.conversations[0].unread_admin).toBe(true);
  });

  await test.step('customer asks a product question, admin answers, it shows publicly', async () => {
    await shop.goto('#/p/6');
    await shop.fill('#qaForm [name=q]', 'هل بتشتغل مع الآيفون؟');
    await shop.click('#qaForm [type=submit]');
    await expect.poll(() => mock.db.product_questions.length).toBe(1);
    await admin.goto('admin/#questions'); await admin.click('[data-act="reload"]');
    await admin.fill('.qa-answer textarea', 'أكيد، بتشتغل مع أي جهاز بلوتوث.');
    await admin.click('.qa-answer [type=submit]');
    await expect.poll(() => mock.db.product_questions[0].status).toBe('published');
    const visitor = await newPage();
    await visitor.goto('#/p/6');
    await expect(visitor.locator('.qa-list')).toContainText('بلوتوث');
  });

  await test.step('signed-in customer sees "my messages" and contact page creates a conversation', async () => {
    await shop.goto('#/contact');
    await shop.fill('#contactForm [name=name]', 'سارة أحمد');
    await shop.fill('#contactForm [name=msg]', 'سؤال عن طلبي');
    await shop.click('#contactForm [type=submit]');
    await expect(shop.locator('.help-msgs .m-customer')).toContainText('سؤال عن طلبي');
    await shop.goto('#/messages');
    await expect(shop.locator('.msg-list li')).toHaveCount(1);
  });

  await test.step('customer deletes the account; the store keeps the order unlinked', async () => {
    await shop.goto('#/account');
    await shop.click('.danger-card summary');
    await expect(shop.locator('#delBtn')).toBeDisabled();
    await shop.fill('#delConfirm', 'احذف');
    await shop.click('#delBtn');
    await expect(shop.locator('#acctPillText')).toHaveText('تسجيل الدخول');
    expect(mock.users.map((u) => u.email)).toEqual(['owner@shop.test']);
    expect(mock.db.orders.find((x) => x.id === orderId).user_id).toBeNull();
  });
});
