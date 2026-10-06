\set ON_ERROR_STOP on
reset role;
create or replace function public.tst_as(u uuid, r text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text,''), false); execute format('set role %I', r); end $$;
create or replace function public.tst_fails(q text, expect text) returns void language plpgsql as $$
begin execute q;
  raise exception 'EXPECTED FAILURE (%) but succeeded: %', expect, q;
exception when others then if sqlerrm not like '%'||expect||'%' then raise exception 'wrong error for [%]: got [%], wanted [%]', q, sqlerrm, expect; end if; end $$;
grant execute on function public.tst_as(uuid, text), public.tst_fails(text, text) to public;

insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','admin@x.com','{"name":"Admin"}'),
 ('00000000-0000-0000-0000-0000000000c1','c1@x.com','{"name":"Ravi","phone":"9812345670"}'),
 ('00000000-0000-0000-0000-0000000000c2','c2@x.com','{"name":"Other","phone":"9811111111"}'),
 ('00000000-0000-0000-0000-0000000000b1','9000000004@partners.nurseryflower.com','{"name":"Mali","phone":"9000000004"}'),
 ('00000000-0000-0000-0000-0000000000b2','9000000005@partners.nurseryflower.com','{"name":"Decor","phone":"9000000005"}'),
 ('00000000-0000-0000-0000-0000000000b3','9000000006@partners.nurseryflower.com','{"name":"Bloom","phone":"9000000006"}');
update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1';
insert into nurseries (id, partner_type, legal_name, brand_name, owner_phone, lat, lng, is_open, priority, starting_price) values
 ('11111111-0000-0000-0000-000000000001','gardener','Ram Mali','Mali Ram Services','9000000004',26.86,80.96,true,0,500),
 ('11111111-0000-0000-0000-000000000002','decorator','Shubh','Shubh Decor','9000000005',26.84,80.93,true,0,5000),
 ('11111111-0000-0000-0000-000000000003','flower_shop','Bloom','Bloom Shop','9000000006',26.87,80.92,true,0,null),
 ('11111111-0000-0000-0000-000000000004','gardener','Far','Far Gardener','9000000007',26.45,80.33,true,0,400);
update profiles set role='partner', nursery_id='11111111-0000-0000-0000-000000000001' where id='00000000-0000-0000-0000-0000000000b1';
update profiles set role='partner', nursery_id='11111111-0000-0000-0000-000000000002' where id='00000000-0000-0000-0000-0000000000b2';
update profiles set role='partner', nursery_id='11111111-0000-0000-0000-000000000003' where id='00000000-0000-0000-0000-0000000000b3';

-- ===== anon submits =====
select tst_as(null,'anon');
select tst_fails($q$select submit_booking('gardener','R','9812345670',current_date+3,'10:00','Gomti Nagar Lko','', '', null,null,null)$q$,'Apna naam');
select tst_fails($q$select submit_booking('gardener','Ravi','12345',current_date+3,'10:00','Gomti Nagar Lko','', '', null,null,null)$q$,'10 ank');
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date+3,'','Gomti Nagar Lko','', '', null,null,null)$q$,'Time chuno');
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date+3,'10:00','abc','', '', null,null,null)$q$,'venue');
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date+3,'10:00','Gomti Nagar Lko','12', '', null,null,null)$q$,'Pincode');
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date-1,'10:00','Gomti Nagar Lko','', '', null,null,null)$q$,'Beeti');
select tst_fails($q$select submit_booking('decor','Ravi','9812345670',current_date+1,'10:00','Hotel Rajdhani Lko','', '', null,null,null)$q$,'72 ghante');
select tst_fails($q$select submit_booking('nope','Ravi','9812345670',current_date+3,'10:00','Gomti Nagar Lko','', '', null,null,null)$q$,'band hai');
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date+3,'10:00','Gomti Nagar Lko','', '', repeat('x',150000),null,null)$q$,'100 KB');
select set_config('t.b1', submit_booking('gardener','Ravi','9812345670',current_date+3,'10:00','Gomti Nagar Lko, Lucknow','', 'lawn cut', null,26.86,80.96), false);
select set_config('t.b2', submit_booking('decor','Ravi','9812345670',current_date+6,'18:00','Hotel Rajdhani Lko','226001', 'wedding', null,null,null), false);
select set_config('t.b3', submit_booking('bulk','Ravi','9812345670',current_date+4,'','NGO office Aliganj','', '500 saplings', null,null,null), false);
do $$ declare n int; begin
  if (select count(*) from bookings) <> 0 then raise exception 'anon can read bookings!'; end if;
  update bookings set status='done'; get diagnostics n = row_count; if n <> 0 then raise exception 'anon updated bookings'; end if;
end $$;
select tst_fails($q$select admin_booking_called(gen_random_uuid())$q$,'permission denied');
select tst_fails($q$select my_bookings()$q$,'permission denied');
select tst_fails($q$select * from partner_jobs$q$,'permission denied');
reset role;
select set_config('t.id1', (select id::text from bookings where short_id = current_setting('t.b1')), false);
select set_config('t.id2', (select id::text from bookings where short_id = current_setting('t.b2')), false);
select set_config('t.id3', (select id::text from bookings where short_id = current_setting('t.b3')), false);
do $$ begin
  if (select count(*) from bookings where handler='owner' and provider_id is null and status='new' and owner_due_at between now()+interval '23 hours' and now()+interval '25 hours') <> 3 then raise exception 'owner-only/24h due not set'; end if;
end $$;

-- ===== availability =====
select tst_as(null,'anon');
do $$ begin
  if (booking_availability('gardener', current_date+3, '10:00')->>'left')::int <> 6 then raise exception 'cap left'; end if;
  if (booking_availability('decor', current_date+1, '10:00')->>'reason') <> 'notice' then raise exception 'notice reason'; end if;
  if (booking_availability('gardener', current_date-2, '10:00')->>'reason') <> 'past' then raise exception 'past reason'; end if;
end $$;

-- ===== customers see only their own =====
reset role; select tst_as('00000000-0000-0000-0000-0000000000c2','authenticated');
do $$ begin if jsonb_array_length(my_bookings()) <> 0 then raise exception 'other customer sees bookings'; end if; end $$;
select tst_fails(format('select cancel_my_booking(%L)', current_setting('t.id1')::uuid),'Booking nahi mili');
reset role; select tst_as('00000000-0000-0000-0000-0000000000c1','authenticated');
do $$ declare x jsonb; begin x := my_bookings(); if jsonb_array_length(x) <> 3 then raise exception 'customer should see 3, got %', jsonb_array_length(x); end if;
  if x::text like '%"note"%' or x::text like '%commission%' or x::text like '%provider_id%' then raise exception 'leaks internal fields'; end if; end $$;

-- ===== admin flow =====
reset role; select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
select admin_booking_called(current_setting('t.id1')::uuid);
select tst_fails(format('select admin_booking_confirm(%L, 0)', current_setting('t.id1')),'rakam');
select admin_booking_confirm(current_setting('t.id1')::uuid, 1000);
do $$ declare b bookings; begin select * into b from bookings where short_id = current_setting('t.b1'); if b.token_amount <> 200 or b.status <> 'confirmed' then raise exception 'confirm wrong % %', b.token_amount, b.status; end if; end $$;
select tst_fails(format('select admin_booking_done(%L)', current_setting('t.id1')),'Token aane');
do $$ declare l jsonb; begin l := admin_providers_for(current_setting('t.id1')::uuid);
  if jsonb_array_length(l) <> 2 or l->0->>'brand' <> 'Mali Ram Services' or l->1->>'brand' <> 'Far Gardener' then raise exception 'provider order %', l; end if; end $$;
update nurseries set priority = 5 where id = '11111111-0000-0000-0000-000000000004';
do $$ declare l jsonb; begin l := admin_providers_for(current_setting('t.id1')::uuid); if l->0->>'brand' <> 'Far Gardener' then raise exception 'priority not honoured'; end if; end $$;
update nurseries set priority = 0 where id = '11111111-0000-0000-0000-000000000004';
select tst_fails(format('select admin_booking_assign(%L, %L)', current_setting('t.id1'), '11111111-0000-0000-0000-000000000002'),'sahi nahi');
select admin_booking_assign(current_setting('t.id1')::uuid, '11111111-0000-0000-0000-000000000001');
select admin_booking_assign(current_setting('t.id2')::uuid, '11111111-0000-0000-0000-000000000002');

-- privacy: id2 assigned while NEW => hidden; id1 confirmed => visible
reset role; select tst_as('00000000-0000-0000-0000-0000000000c1','authenticated');
do $$ declare x jsonb; begin
  select e into x from jsonb_array_elements(my_bookings()) e where e->>'short_id' = current_setting('t.b2');
  if x->>'provider_brand' is not null or x->>'provider_phone' is not null or x::text like '%Shubh%' or x::text like '%9000000005%' then raise exception 'provider leaked before confirm: %', x; end if;
  select e into x from jsonb_array_elements(my_bookings()) e where e->>'short_id' = current_setting('t.b1');
  if x->>'provider_brand' <> 'Mali Ram Services' or x->>'provider_phone' <> '9000000004' then raise exception 'provider hidden after confirm: %', x; end if;
end $$;
select claim_token_paid(current_setting('t.id1')::uuid);
select tst_fails(format('select claim_token_paid(%L)', current_setting('t.id2')),'Token abhi nahi');

-- ===== partner: no customer data =====
reset role; select tst_as('00000000-0000-0000-0000-0000000000b1','authenticated');
do $$ declare n int; c text; begin
  select count(*) into n from partner_jobs; if n <> 1 then raise exception 'gardener should see 1 job, got %', n; end if;
  select string_agg(column_name, ',') into c from information_schema.columns where table_name='partner_jobs';
  if c ilike '%customer%' or c ilike '%phone%' or c ilike '%note%' then raise exception 'partner_jobs exposes: %', c; end if;
  if (select count(*) from bookings) <> 0 then raise exception 'partner can read bookings table'; end if;
  if (select count(*) from leads) <> 0 then raise exception 'partner can read leads'; end if;
end $$;
select tst_fails(format('select respond_job(%L, %L)', current_setting('t.id1'), 'done'),'Pehle kaam accept');
select respond_job(current_setting('t.id1')::uuid, 'accept');
select tst_fails(format('select respond_job(%L, %L)', current_setting('t.id1'), 'done'),'Token aane');
-- other partner cannot touch this job
reset role; select tst_as('00000000-0000-0000-0000-0000000000b3','authenticated');
select tst_fails(format('select respond_job(%L, %L)', current_setting('t.id1'), 'accept'),'Kaam nahi mila');
do $$ begin if (select count(*) from partner_jobs) <> 0 then raise exception 'other partner sees job'; end if; end $$;
-- partner profile
reset role; select tst_as('00000000-0000-0000-0000-0000000000b1','authenticated');
select update_my_profile('{"startingPrice":650,"serviceRadiusKm":12,"bio":"hello","blockedDates":["2030-01-02","bad","2030-01-01"]}'::jsonb);
do $$ declare n nurseries; begin select * into n from nurseries where id='11111111-0000-0000-0000-000000000001'; if n.starting_price <> 650 or n.service_radius_km <> 12 or n.blocked_dates <> array['2030-01-01','2030-01-02'] then raise exception 'profile wrong %', n; end if; end $$;
do $$ declare n int; begin update nurseries set priority = 99 where id='11111111-0000-0000-0000-000000000001'; get diagnostics n = row_count; if n <> 0 then raise exception 'partner can edit own priority/nursery directly'; end if; end $$;

-- ===== token, capacity, done =====
reset role; select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
select admin_booking_token_paid(current_setting('t.id1')::uuid);
do $$ declare b bookings; begin select * into b from bookings where short_id = current_setting('t.b1'); if b.status <> 'token_paid' or b.token_paid_at is null then raise exception 'token not paid'; end if; end $$;
select tst_fails(format('select admin_booking_token_paid(%L)', current_setting('t.id1')),'confirm karo');
reset role; select tst_as(null,'anon');
do $$ begin if (booking_availability('gardener', current_date+3, '10:00')->>'left')::int <> 5 then raise exception 'capacity not reduced after token'; end if; end $$;
reset role; select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
update services set daily_capacity = 1 where key = 'gardener';
reset role; select tst_as(null,'anon');
do $$ begin if (booking_availability('gardener', current_date+3, '10:00')->>'reason') <> 'full' then raise exception 'should be full'; end if; end $$;
select tst_fails($q$select submit_booking('gardener','Ravi','9812345670',current_date+3,'11:00','Another place Lko','', '', null,null,null)$q$,'poori hai');
reset role; update services set daily_capacity = 6 where key = 'gardener';
-- provider marks done
select tst_as('00000000-0000-0000-0000-0000000000b1','authenticated');
select respond_job(current_setting('t.id1')::uuid, 'done');
do $$ declare s text; a numeric; begin select status, amount into s, a from partner_jobs where short_id = current_setting('t.b1'); if s <> 'done' or a <> 900 then raise exception 'job done/amount wrong % %', s, a; end if; end $$;
-- decline returns to owner
reset role; select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
select admin_booking_assign(current_setting('t.id3')::uuid, '11111111-0000-0000-0000-000000000003');
reset role; select tst_as('00000000-0000-0000-0000-0000000000b3','authenticated');
select respond_job(current_setting('t.id3')::uuid, 'decline');
reset role;
do $$ declare b bookings; begin select * into b from bookings where short_id = current_setting('t.b3'); if b.handler <> 'owner' or b.provider_id is not null then raise exception 'decline did not return to owner'; end if; end $$;

-- ===== refund matrix =====
-- direct inserts at fixed distances, then cancel via the real functions
insert into bookings (short_id, service_key, customer_name, customer_phone, date, time, venue, status, owner_due_at, token_percent, token_amount, token_paid_at, agreed_amount, commission_percent) values
 ('R80','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date + 10, '12:00','venue one', 'token_paid', now()+interval '1 day', 25, 2000, now(), 8000, 10),
 ('R50','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date + 2, '23:00','venue two', 'token_paid', now()+interval '1 day', 25, 2000, now(), 8000, 10),
 ('R00','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date, '23:59','venue three', 'token_paid', now()+interval '1 day', 25, 2000, now(), 8000, 10),
 ('RNT','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date + 10, '12:00','venue four', 'confirmed', now()+interval '1 day', 25, 2000, null, 8000, 10),
 ('RAD','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date + 1, '12:00','venue five', 'token_paid', now()+interval '1 day', 25, 2000, now(), 8000, 10);
select set_config('t.R80',(select id::text from bookings where short_id='R80'),false), set_config('t.R50',(select id::text from bookings where short_id='R50'),false), set_config('t.R00',(select id::text from bookings where short_id='R00'),false), set_config('t.RNT',(select id::text from bookings where short_id='RNT'),false), set_config('t.RAD',(select id::text from bookings where short_id='RAD'),false);
select tst_as('00000000-0000-0000-0000-0000000000c1','authenticated');
do $$ declare r numeric; begin
  r := cancel_my_booking(current_setting('t.R80')::uuid); if r <> 1600 then raise exception '72h+ refund expected 1600 got %', r; end if;
  r := cancel_my_booking(current_setting('t.R50')::uuid); if r <> 1000 then raise exception '24-72h refund expected 1000 got %', r; end if;
  r := cancel_my_booking(current_setting('t.R00')::uuid); if r <> 0 then raise exception '<24h refund expected 0 got %', r; end if;
  r := cancel_my_booking(current_setting('t.RNT')::uuid); if r <> 0 then raise exception 'no token => 0, got %', r; end if;
end $$;
select tst_fails(format('select cancel_my_booking(%L)', current_setting('t.R80')), 'pehle hi band');
reset role; select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
select tst_fails(format('select admin_booking_cancel(%L, %L, %L)', current_setting('t.RAD'), 'owner', ''),'reason');
do $$ declare r numeric; begin
  r := admin_booking_cancel(current_setting('t.RAD')::uuid, 'provider', 'provider unavailable'); if r <> 2000 then raise exception 'provider cancel must be full refund, got %', r; end if;
end $$;
-- settings tiers are editable
update settings set refund_72 = 100, refund_24 = 25, refund_low = 10 where id = 1;
reset role;
insert into bookings (short_id, service_key, customer_name, customer_phone, date, time, venue, status, owner_due_at, token_percent, token_amount, token_paid_at, agreed_amount, commission_percent, customer_id) values
 ('RS1','decor','R','9812345670', (now() at time zone 'Asia/Kolkata')::date + 10, '12:00','venue six', 'token_paid', now()+interval '1 day', 25, 2000, now(), 8000, 10, '00000000-0000-0000-0000-0000000000c1');
select set_config('t.RS1',(select id::text from bookings where short_id='RS1'),false);
select tst_as('00000000-0000-0000-0000-0000000000c1','authenticated');
do $$ declare r numeric; begin r := cancel_my_booking(current_setting('t.RS1')::uuid); if r <> 2000 then raise exception 'custom refund_72=100 expected 2000 got %', r; end if; end $$;
-- audit trail
reset role;
do $$ begin if (select count(*) from audit where action in ('booking_confirm','booking_token_paid','booking_assign','booking_cancel','booking_called')) < 5 then raise exception 'audit missing'; end if; end $$;
-- admin edit of customer-filled details
select tst_as('00000000-0000-0000-0000-0000000000a1','authenticated');
select admin_update_booking(current_setting('t.id2')::uuid, '{"venue":"Taj Hotel Lucknow","note":"VIP"}'::jsonb);
do $$ begin if (select venue from bookings where short_id = current_setting('t.b2')) <> 'Taj Hotel Lucknow' then raise exception 'edit failed'; end if;
  if not exists (select 1 from audit where action='booking_edit') then raise exception 'edit not audited'; end if; end $$;
reset role;
select 'ALL BOOKING SQL CHECKS PASSED' as result;
