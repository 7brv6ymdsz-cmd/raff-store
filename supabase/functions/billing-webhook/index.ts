// Supabase Edge Function: receives Lemon Squeezy subscription webhooks and updates public.subscriptions.
// Deploy:  supabase functions deploy billing-webhook --no-verify-jwt
// Secrets: supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=... LEMONSQUEEZY_VARIANT_PRO=... LEMONSQUEEZY_VARIANT_BUSINESS=...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.)
import { toUpsertArgs, verifySignature } from './logic.js';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const raw = await req.text();
  const ok = await verifySignature(raw, req.headers.get('x-signature') ?? '', Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '');
  if (!ok) return new Response('bad signature', { status: 401 });
  let event: unknown;
  try { event = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }
  const args = toUpsertArgs(event, {
    pro: Deno.env.get('LEMONSQUEEZY_VARIANT_PRO') ?? '',
    business: Deno.env.get('LEMONSQUEEZY_VARIANT_BUSINESS') ?? '',
  });
  if (!args) return new Response('ignored', { status: 200 });
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/billing_upsert`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  const out = await res.text();
  // 5xx makes Lemon Squeezy retry; an unknown member is answered 200 so it is not retried forever.
  if (!res.ok) return new Response(`db error: ${out}`, { status: 500 });
  return new Response(out, { status: 200 });
});
