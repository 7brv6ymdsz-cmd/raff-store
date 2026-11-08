\set ON_ERROR_STOP 1
-- Halal screening and suspensions.
select 'normalize: [' || btrim(public.halal_normalize('الخُمُور، وإباحيّة!! Poker-Night')) || ']';
select 'hits arabic with prefixes: ' || array_to_string(public.halal_violations('عرض خاص على الخمور وبالكازينو'), ',');
select 'hits english: ' || array_to_string(public.halal_violations('Best online CASINO and wine club'), ',');
select 'hits phrase: ' || array_to_string(public.halal_violations('احصل على قرض بفائدة مخفضة'), ',');
select 'riba word: ' || array_to_string(public.halal_violations('معاملات بالربا'), ',');
select 'clean text: [' || array_to_string(public.halal_violations('فائدة المنتج كبيرة: كوب سيراميك للقهوة وعطر بدون كحول'), ',') || ']';
select 'common words and names stay clean: [' || array_to_string(public.halal_violations('حقيبة كبيرة من سحر الشرق، بيرين للأطفال، لون نبيذي'), ',') || ']';
select 'black magic phrase: ' || array_to_string(public.halal_violations('خدمات السحر الأسود وجلب الحبيب'), ',');
select 'no false hit inside a word (سحر vs ساحرة, wine vs winery? sahara): [' || array_to_string(public.halal_violations('إطلالة ساحرة على الصحراء'), ',') || ']';
insert into public.categories values ('home','البيت','#d9c3a5',0);
do $$ begin insert into public.products (name, brand, category_id, price, stock) values ('نبيذ أحمر فاخر', 'x', 'home', 20, 5); raise exception 'SHOULD FAIL'; exception when others then raise notice 'haram product blocked: %', sqlerrm; end $$;
insert into public.products (id, name, brand, category_id, price, stock) values (1, 'كوب فخار', 'فخار', 'home', 18, 5);
do $$ begin update public.products set description = 'مثالي لحفلات البيرة' where id = 1; raise exception 'SHOULD FAIL'; exception when others then raise notice 'haram description blocked: %', sqlerrm; end $$;
update public.products set description = 'مثالي للقهوة الصباحية' where id = 1;
select 'clean product saved: ' || description from public.products where id = 1;

insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','owner@x','{}'), ('00000000-0000-0000-0000-0000000000d1','member@x','{"full_name":"عضو"}');
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select 'owner claim: ' || public.claim_admin();
select 'grant: ' || (public.admin_grant_subscription('member@x', 'pro', 30)->>'status');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
insert into public.mizan_entries (kind, amount) values ('income', 100);
select 'member active: ' || public.subscription_active();
do $$ begin perform public.admin_block_member(auth.uid(), 'x'); raise exception 'SHOULD FAIL'; exception when others then raise notice 'member cannot block: %', sqlerrm; end $$;
do $$ begin insert into public.halal_terms (term, category) values ('قهوه', 'alcohol'); raise exception 'SHOULD FAIL'; exception when insufficient_privilege then raise notice 'member cannot edit the banned list'; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.admin_block_member('00000000-0000-0000-0000-0000000000d1', 'إعلانات قمار');
do $$ begin perform public.admin_block_member('00000000-0000-0000-0000-00000000000a', 'x'); raise exception 'SHOULD FAIL'; exception when others then raise notice 'staff cannot be blocked: %', sqlerrm; end $$;
select 'list: ' || string_agg(email || ' active=' || active || ' blocked=' || blocked || ' (' || block_reason || ')', ' | ') from public.admin_list_subscriptions();
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select 'blocked member active: ' || public.subscription_active() || ', sees entries: ' || (select count(*) from public.mizan_entries);
select 'blocked member status: ' || (public.my_subscription()->>'blocked') || ' reason=' || (public.my_subscription()->>'reason');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.admin_unblock_member('00000000-0000-0000-0000-0000000000d1');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
select 'after unblock: ' || public.subscription_active() || ', entries back: ' || (select count(*) from public.mizan_entries);
reset role;
