import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { verifySignature, toUpsertArgs } from '../../supabase/functions/billing-webhook/logic.js';

// The payment webhook's logic, run directly (no browser): signature check + event → billing_upsert() arguments.
const SECRET = 'whsec_test_123';
const sign = (body, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');
const UID = '0b9e7f3a-4c2d-4e8f-9a1b-2c3d4e5f6a7b';
const event = (name, attrs, extra = {}) => ({
  meta: { event_name: name, custom_data: { user_id: UID }, ...extra.meta },
  data: { type: 'subscriptions', id: '4815', attributes: {
    customer_id: 162, variant_id: 501, variant_name: 'Pro', product_name: 'Rawaj', user_email: 'amal@example.com',
    status: 'active', trial_ends_at: null, renews_at: '2026-12-08T10:00:00.000000Z', ends_at: null,
    urls: { update_payment_method: 'https://store.example/update', customer_portal: 'https://store.example/portal' }, ...attrs,
  } },
});

test('a genuine webhook is accepted; a tampered, unsigned or wrongly signed one is not', async () => {
  const body = JSON.stringify(event('subscription_created', {}));
  expect(await verifySignature(body, sign(body), SECRET)).toBe(true);
  expect(await verifySignature(body, sign(body).toUpperCase(), SECRET)).toBe(true);
  expect(await verifySignature(body.replace('active', 'expired'), sign(body), SECRET)).toBe(false);
  expect(await verifySignature(body, sign(body, 'other'), SECRET)).toBe(false);
  expect(await verifySignature(body, '', SECRET)).toBe(false);
  expect(await verifySignature(body, 'not-hex', SECRET)).toBe(false);
  expect(await verifySignature(body, sign(body), '')).toBe(false);
});

test('subscription events map to the plan, status and the end of the paid period', async () => {
  const variants = { pro: '501', business: '502' };
  expect(toUpsertArgs(event('subscription_created', {}), variants)).toEqual({
    p_user: UID, p_email: 'amal@example.com', p_plan: 'pro', p_status: 'active', p_period_end: '2026-12-08T10:00:00.000Z',
    p_provider: 'lemonsqueezy', p_sub_id: '4815', p_customer_id: '162', p_manage_url: 'https://store.example/portal',
  });
  expect(toUpsertArgs(event('subscription_updated', { variant_id: 502 }), variants).p_plan).toBe('business');
  // cancelled: open until ends_at; trial: until trial_ends_at
  const c = toUpsertArgs(event('subscription_cancelled', { status: 'cancelled', ends_at: '2026-12-01T00:00:00Z' }), variants);
  expect([c.p_status, c.p_period_end]).toEqual(['cancelled', '2026-12-01T00:00:00.000Z']);
  const t = toUpsertArgs(event('subscription_created', { status: 'on_trial', trial_ends_at: '2026-11-15T00:00:00Z' }), variants);
  expect([t.p_status, t.p_period_end]).toEqual(['on_trial', '2026-11-15T00:00:00.000Z']);
  expect(toUpsertArgs(event('subscription_expired', { status: 'expired', ends_at: '2026-11-08T00:00:00Z' }), variants).p_status).toBe('expired');
  // no variant ids configured: the variant name decides
  expect(toUpsertArgs(event('subscription_created', { variant_id: 9, variant_name: 'Business' }), {}).p_plan).toBe('business');
  expect(toUpsertArgs(event('subscription_created', { variant_id: 9, variant_name: 'باقة الأعمال' }), {}).p_plan).toBe('business');
});

test('events we do not act on are ignored, and a forged member id is dropped in favour of the email', async () => {
  expect(toUpsertArgs({ meta: { event_name: 'order_created' }, data: { type: 'orders', id: '1', attributes: {} } })).toBeNull();
  expect(toUpsertArgs({ meta: { event_name: 'subscription_payment_success' }, data: { type: 'subscription-invoices', id: '1', attributes: { status: 'paid' } } })).toBeNull();
  expect(toUpsertArgs(event('subscription_updated', { status: 'weird' }))).toBeNull();
  expect(toUpsertArgs(null)).toBeNull();
  const forged = toUpsertArgs(event('subscription_created', {}, { meta: { custom_data: { user_id: "x' or 1=1" } } }));
  expect(forged.p_user).toBeNull();
  expect(forged.p_email).toBe('amal@example.com');
});
