\set ON_ERROR_STOP 1
-- Subscriptions open Mizan; the lock is enforced by row-level security, not by the page.
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','owner@x','{"full_name":"المالك"}'),
 ('00000000-0000-0000-0000-0000000000c1','amal@x','{"full_name":"أمل"}'),
 ('00000000-0000-0000-0000-0000000000c2','basel@x','{"full_name":"باسل"}');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'owner claim: ' || public.claim_admin();

-- Amal, no plan yet: Mizan is locked
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select 'amal active before plan: ' || public.subscription_active();
select 'amal my_subscription before plan: ' || coalesce(public.my_subscription()::text, 'null');
do $$ begin insert into public.mizan_entries (kind, amount) values ('income', 100); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'locked insert blocked'; end $$;
do $$ begin insert into public.subscriptions (user_id, plan, status) values (auth.uid(), 'pro', 'active'); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'self-subscribe blocked'; end $$;
do $$ begin perform public.admin_grant_subscription('amal@x', 'pro', 30); raise exception 'SHOULD FAIL'; exception when others then raise notice 'member self-grant blocked: %', sqlerrm; end $$;
do $$ begin perform public.billing_upsert(auth.uid(), 'amal@x', 'pro', 'active', now() + interval '30 days', 'lemonsqueezy', 's1', 'c1', ''); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'member webhook call blocked'; end $$;

-- the owner grants 30 days
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'grant: ' || (public.admin_grant_subscription('AMAL@x', 'pro', 30)->>'status');
do $$ begin perform public.admin_grant_subscription('nobody@x', 'pro', 30); raise exception 'SHOULD FAIL'; exception when others then raise notice 'unknown email: %', sqlerrm; end $$;
do $$ begin perform public.admin_grant_subscription('amal@x', 'gold', 30); raise exception 'SHOULD FAIL'; exception when others then raise notice 'bad plan: %', sqlerrm; end $$;

-- Amal uses Mizan
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select 'amal active: ' || public.subscription_active() || ', plan ' || (public.my_subscription()->>'plan');
insert into public.mizan_books (settings) values ('{"business":"استوديو أمل","currency":"$"}');
insert into public.mizan_entries (day, kind, category, amount) values ('2026-11-01','income','خدمات',500),('2026-11-02','expense','إعلانات',120),('2026-11-03','income','مبيعات',250.5);
insert into public.mizan_clients (name, email) values ('شركة الأفق','info@ofoq.example');
insert into public.mizan_invoices (number, client, items, tax_rate) values ('INV-001','شركة الأفق','[{"d":"تصميم","q":1,"p":450}]',0.16);
select 'amal sees: entries ' || (select count(*) from public.mizan_entries) || ', profit ' || (select sum(case kind when 'income' then amount else -amount end) from public.mizan_entries)
  || ', clients ' || (select count(*) from public.mizan_clients) || ', invoices ' || (select count(*) from public.mizan_invoices);
do $$ begin update public.subscriptions set current_period_end = null where user_id = auth.uid(); raise notice 'self-extend rows: %', (select count(*) from public.subscriptions where user_id = auth.uid() and current_period_end is null); end $$;
do $$ begin insert into public.mizan_entries (user_id, kind, amount) values ('00000000-0000-0000-0000-0000000000c2', 'income', 1); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'writing into someone else''s book blocked'; end $$;
do $$ begin insert into public.mizan_entries (kind, amount) values ('gift', 1); raise exception 'SHOULD FAIL'; exception when check_violation then raise notice 'bad kind blocked'; end $$;

-- Basel subscribes through the payment webhook (service role), found by email
reset role; set role service_role;
select 'webhook basel: ' || public.billing_upsert(null, 'BASEL@x', 'business', 'active', now() + interval '30 days', 'lemonsqueezy', 'sub_77', 'cus_9', 'https://pay.example/portal');
select 'webhook unknown: ' || public.billing_upsert(null, 'ghost@x', 'pro', 'active', now() + interval '30 days', 'lemonsqueezy', 'sub_88', 'cus_8', '');
reset role; set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'basel active: ' || public.subscription_active() || ', manage url kept: ' || (public.my_subscription()->>'manage_url');
select 'basel sees amal''s entries: ' || count(*) from public.mizan_entries;
insert into public.mizan_entries (kind, amount) values ('expense', 40);

-- cancelled but still inside the paid month: open; once the period ends: locked
reset role; set role service_role;
select 'cancel (paid until next week): ' || public.billing_upsert(null, null, 'business', 'cancelled', now() + interval '7 days', 'lemonsqueezy', 'sub_77', 'cus_9', '');
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'basel after cancel, period left: ' || public.subscription_active() || ', entries ' || (select count(*) from public.mizan_entries);
reset role; set role service_role;
select 'expired: ' || public.billing_upsert(null, null, 'business', 'expired', now() - interval '1 minute', 'lemonsqueezy', 'sub_77', 'cus_9', '');
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'basel after expiry: active ' || public.subscription_active() || ', sees entries ' || (select count(*) from public.mizan_entries);
do $$ begin insert into public.mizan_entries (kind, amount) values ('income', 1); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'expired write blocked'; end $$;
reset role;
select 'basel data kept while locked: ' || count(*) from public.mizan_entries where user_id = '00000000-0000-0000-0000-0000000000c2';

-- past_due outside the period is locked, trial is open, no end date (manual) is open
set role service_role;
select public.billing_upsert(null, null, 'business', 'past_due', now() - interval '1 day', 'lemonsqueezy', 'sub_77', 'cus_9', '');
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'past_due after period: ' || public.subscription_active();
reset role; set role service_role;
select public.billing_upsert(null, null, 'business', 'on_trial', now() + interval '7 days', 'lemonsqueezy', 'sub_77', 'cus_9', '');
reset role; set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
select 'trial: ' || public.subscription_active() || ', data back: ' || (select count(*) from public.mizan_entries);

-- the owner ends Amal's plan, lists members, then gives a plan with no end date
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.admin_end_subscription('00000000-0000-0000-0000-0000000000c1');
select 'list: ' || string_agg(email || ' ' || plan || ' ' || status || ' active=' || active, ' | ' order by email) from public.admin_list_subscriptions();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select 'amal after end: ' || public.subscription_active() || ', sees ' || (select count(*) from public.mizan_entries) || ' entries';
select 'member listing others: ' || count(*) from public.admin_list_subscriptions();
select 'member sees subscription rows: ' || count(*) from public.subscriptions;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'grant no end date: ' || coalesce(public.admin_grant_subscription('amal@x', 'business', null)->>'current_period_end', 'none');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
select 'amal back: ' || public.subscription_active() || ', entries ' || (select count(*) from public.mizan_entries);
set role anon; set request.jwt.claim.sub = '';
select 'anon active: ' || public.subscription_active();
select 'anon sees mizan entries: ' || count(*) from public.mizan_entries;
reset role;
