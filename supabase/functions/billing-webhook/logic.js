// Lemon Squeezy subscription webhooks → arguments for public.billing_upsert().
// Pure functions (Web Crypto only) so the same code runs in the Supabase Edge Function (Deno) and in the tests (Node).

const enc = new TextEncoder();
const STATUSES = ['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** HMAC-SHA256 of the raw body with the signing secret, hex, compared in constant time with the X-Signature header. */
export async function verifySignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(rawBody)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
  const a = hex, b = signature.toLowerCase();
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Turns a subscription event into billing_upsert() arguments, or null when the event is not one we act on.
 * variants: { pro: '<variant id>', business: '<variant id>' } from the function's secrets.
 */
export function toUpsertArgs(event, variants = {}) {
  if (!event || typeof event !== 'object') return null;
  const meta = event.meta || {}, data = event.data || {};
  if (data.type !== 'subscriptions' || !String(meta.event_name || '').startsWith('subscription_')) return null;
  const a = data.attributes || {};
  if (!STATUSES.includes(a.status)) return null;
  const custom = meta.custom_data || {};
  const userId = typeof custom.user_id === 'string' && UUID.test(custom.user_id) ? custom.user_id : null;
  const variant = String(a.variant_id ?? '');
  const name = `${a.variant_name || ''} ${a.product_name || ''}`.toLowerCase();
  const plan = variant && variant === String(variants.business || '') ? 'business'
    : variant && variant === String(variants.pro || '') ? 'pro'
      : /business|أعمال/.test(name) ? 'business' : 'pro';
  const end = a.status === 'on_trial' ? a.trial_ends_at
    : ['cancelled', 'expired'].includes(a.status) ? (a.ends_at || a.renews_at)
      : (a.renews_at || a.ends_at);
  const urls = a.urls || {};
  return {
    p_user: userId,
    p_email: typeof a.user_email === 'string' ? a.user_email : null,
    p_plan: plan,
    p_status: a.status,
    p_period_end: end ? new Date(end).toISOString() : null,
    p_provider: 'lemonsqueezy',
    p_sub_id: data.id != null ? String(data.id) : null,
    p_customer_id: a.customer_id != null ? String(a.customer_id) : null,
    p_manage_url: urls.customer_portal || urls.update_payment_method || '',
  };
}
