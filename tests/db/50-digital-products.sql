\set ON_ERROR_STOP 1
-- Digital products: no stock, no address, no shipping, no cash on delivery.
update public.settings set data = '{"shipping":{"fee":5,"freeOver":0},"payments":{"cod":{"on":true},"paypal":{"on":true,"user":"me"},"bank":{"on":false}}}' where id=1;
insert into public.products (id,name,brand,price,stock,product_type,digital) values
  (1,'كتاب PDF','رف',12,0,'digital','{"format":"PDF","buyUrl":"https://payhip.com/b/x"}'),
  (2,'كوب','فخار',18,3,'physical','{}');
do $$ begin insert into public.products (name,price,product_type) values ('x',1,'service'); raise exception 'SHOULD FAIL'; exception when check_violation then raise notice 'bad product_type blocked'; end $$;

set role anon; set request.jwt.claim.sub = '';
select 'anon sees digital fields: ' || product_type || ' ' || (digital->>'format') from public.products where id = 1;
do $$ declare o jsonb; begin
  o := public.place_order('{"customer":{"name":"زائر","phone":"+96170999888","email":"a@b.co"},"method":"paypal","items":[{"id":1,"qty":3}]}');
  raise notice 'digital order: qty=% sub=% ship=% total=% digital=% address=%', o->'items'->0->>'qty', o->>'subtotal', o->>'shipping', o->>'total', o->'items'->0->>'digital', coalesce(o->'customer'->>'address', '');
end $$;
do $$ declare o jsonb; begin
  o := public.place_order('{"customer":{"name":"زائر","phone":"+96170999888"},"method":"manual","items":[{"id":1,"qty":1}]}');
  raise notice 'manual digital order: method=% total=%', o->>'method', o->>'total';
end $$;
do $$ begin perform public.place_order('{"customer":{"name":"زائر","phone":"+96170999888"},"method":"cod","items":[{"id":1,"qty":1}]}'); raise exception 'SHOULD FAIL'; exception when others then raise notice 'cod on digital blocked: %', sqlerrm; end $$;
do $$ begin perform public.place_order('{"customer":{"name":"زائر","phone":"+96170999888"},"method":"cod","items":[{"id":1,"qty":1},{"id":2,"qty":1}]}'); raise exception 'SHOULD FAIL'; exception when others then raise notice 'mixed cart without address blocked: %', sqlerrm; end $$;
do $$ begin perform public.place_order('{"customer":{"name":"زائر","phone":"+96170999888","city":"بيروت","address":"الحمرا شارع ١"},"method":"manual","items":[{"id":2,"qty":1}]}'); raise exception 'SHOULD FAIL'; exception when others then raise notice 'manual on physical blocked: %', sqlerrm; end $$;
do $$ declare o jsonb; begin
  o := public.place_order('{"customer":{"name":"زائر","phone":"+96170999888","city":"بيروت","address":"الحمرا شارع ١"},"method":"cod","items":[{"id":1,"qty":1},{"id":2,"qty":1}]}');
  raise notice 'mixed order: sub=% ship=% total=%', o->>'subtotal', o->>'shipping', o->>'total';
  perform set_config('t.oid', o->>'id', false);
end $$;
reset role;
select 'digital stock untouched: ' || stock from public.products where id = 1;
select 'physical stock 3-1: ' || stock from public.products where id = 2;
select 'no low-stock alert for digital: ' || count(*) from public.admin_notifications where link = '#inventory/1';
