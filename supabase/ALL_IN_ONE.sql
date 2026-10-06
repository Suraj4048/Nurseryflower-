-- ============================================================
-- NurseryFlower: schema. Supabase Dashboard > SQL Editor me paste karke RUN karo (001 -> 002 -> 003 -> 004 ke order me).
-- Ya sirf ek file: supabase/ALL_IN_ONE.sql
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'customer' check (role in ('customer','partner','admin')),
  name text not null default 'Customer',
  phone text,
  email text,
  nursery_id uuid,
  language text not null default 'hi',
  created_at timestamptz not null default now()
);

create sequence if not exists public.nursery_seq start 1;

create table if not exists public.nurseries (
  id uuid primary key default gen_random_uuid(),
  unique_id text unique,
  partner_type text not null check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop')),
  legal_name text not null,
  brand_name text not null,
  seo_aliases text[] not null default '{}',
  owner_phone text,
  lat float8 not null default 26.8467,
  lng float8 not null default 80.9462,
  city text not null default 'Lucknow',
  is_open boolean not null default false,
  tier text not null default 'new' check (tier in ('new','verified','trusted','star')),
  probation_ends_on date,
  licence_no text,
  licence_expiry date,
  gstin text,
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_nursery_fk;
alter table public.profiles add constraint profiles_nursery_fk foreign key (nursery_id) references public.nurseries(id) on delete set null;

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  nursery_id uuid not null references public.nurseries(id) on delete cascade,
  sku text not null,
  name jsonb not null,
  category text not null,
  price numeric not null check (price > 0),
  stock int not null default 0 check (stock >= 0),
  image text not null default '',
  care text not null default '',
  festival_tags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','live','rejected')),
  reject_reason text,
  created_at timestamptz not null default now()
);
create index if not exists plants_nursery_idx on public.plants(nursery_id);
create index if not exists plants_sku_idx on public.plants(sku);

create table if not exists public.delivery_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_per_km numeric not null default 8,
  min_charge numeric not null default 50,
  vehicle_types text[] not null default '{bike}',
  active boolean not null default true,
  deep_link text
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique,
  customer_id uuid not null references public.profiles(id),
  customer_name text not null default '',
  customer_phone text not null default '',
  nursery_id uuid not null references public.nurseries(id),
  nursery_brand text not null,
  tried_nursery_ids uuid[] not null default '{}',
  items jsonb not null,
  subtotal numeric not null,
  delivery_fee numeric not null default 0,
  total numeric not null,
  payment_method text not null check (payment_method in ('cod','upi')),
  status text not null default 'new' check (status in ('new','accepted','packed','out_for_delivery','delivered','cancelled','rejected','expired')),
  delivery_partner_id uuid,
  delivery_partner_name text,
  address text not null,
  pincode text not null default '',
  lat float8 not null,
  lng float8 not null,
  cancel_until timestamptz not null,
  accept_by timestamptz not null,
  events jsonb not null default '[]',
  rating int check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now()
);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_nursery_idx on public.orders(nursery_id);
create index if not exists orders_status_idx on public.orders(status, accept_by);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  partner_type text not null check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop')),
  shop_name text not null default '',
  brand_suggestion text not null default '',
  owner_name text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  city text not null default 'Lucknow',
  pincode text not null default '',
  lat float8,
  lng float8,
  language text not null default 'hi',
  upi_id text not null default '',
  gstin text not null default '',
  licence_no text not null default '',
  licence_expiry text not null default '',
  docs jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft','submitted','under_review','need_more_info','approved','rejected','withdrawn')),
  checklist jsonb not null default '{}',
  review_note text,
  reject_reason text,
  consent_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  sla_due_at timestamptz,
  nursery_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  reason text not null,
  photo text,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  created_at timestamptz not null default now()
);

create table if not exists public.rules (
  partner_type text primary key check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop')),
  allowed_id_docs text[] not null,
  required_docs text[] not null default '{}',
  licence_required boolean not null default false,
  gst_required boolean not null default false,
  allowed_categories text[] not null,
  max_live_probation int not null default 20
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  accept_seconds int not null default 300,
  cancel_seconds int not null default 120,
  probation_days int not null default 14,
  payout_hold_days int not null default 7,
  sla_hours int not null default 48,
  split jsonb not null default '{"nursery":80,"platform":15,"pool":5}'
);

create table if not exists public.audit (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor text not null default '',
  action text not null,
  detail text not null default ''
);

-- realtime
do $$ begin
  begin alter publication supabase_realtime add table public.orders; exception when others then null; end;
  begin alter publication supabase_realtime add table public.plants; exception when others then null; end;
  begin alter publication supabase_realtime add table public.nurseries; exception when others then null; end;
  begin alter publication supabase_realtime add table public.applications; exception when others then null; end;
  begin alter publication supabase_realtime add table public.complaints; exception when others then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when others then null; end;
end $$;
-- ============================================================
-- Helpers + business logic (RPC). Saare paise/stock/status ke kaam yahi server par hote hain.
-- ============================================================
create or replace function public.now_ms() returns bigint language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

create or replace function public.hav_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8) returns float8 language sql immutable as $$
  select 2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;
create or replace function public.my_nursery_id() returns uuid language sql stable security definer set search_path = public as $$
  select nursery_id from public.profiles where id = auth.uid()
$$;

create or replace function public.push_event(ev jsonb, st text, note text default null) returns jsonb language sql stable as $$
  select ev || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('status', st, 'at', public.now_ms(), 'note', note)))
$$;

create or replace function public.audit_log(p_action text, p_detail text) returns void language sql security definer set search_path = public as $$
  insert into public.audit(actor, action, detail) values (coalesce(auth.uid()::text, 'system'), p_action, p_detail)
$$;

-- ---- naya user aate hi profile banao ----
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare ph text;
begin
  ph := coalesce(nullif(new.phone, ''), new.raw_user_meta_data->>'phone');
  if ph is not null then ph := right(regexp_replace(ph, '\D', '', 'g'), 10); end if;
  insert into public.profiles(id, name, phone, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Customer'), ph, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---- nursery ka unique ID: NURS-LKO-001 ----
create or replace function public.nursery_before_insert() returns trigger language plpgsql as $$
declare code text;
begin
  if new.unique_id is null or new.unique_id = '' then
    code := case lower(trim(new.city)) when 'lucknow' then 'LKO' when 'delhi' then 'DEL' when 'kanpur' then 'KNP' when 'varanasi' then 'VNS' when 'patna' then 'PAT' when 'mumbai' then 'MUM'
            else upper(left(regexp_replace(new.city, '[^A-Za-z]', '', 'g') || 'XXX', 3)) end;
    new.unique_id := 'NURS-' || code || '-' || lpad(nextval('public.nursery_seq')::text, 3, '0');
  end if;
  return new;
end $$;
drop trigger if exists nursery_uid on public.nurseries;
create trigger nursery_uid before insert on public.nurseries for each row execute function public.nursery_before_insert();

-- ---- applicant sirf apni basic detail badal sake, review fields nahi ----
create or replace function public.guard_application_update() returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.status := old.status; new.checklist := old.checklist; new.review_note := old.review_note; new.reject_reason := old.reject_reason;
    new.nursery_id := old.nursery_id; new.reviewed_at := old.reviewed_at; new.submitted_at := old.submitted_at; new.sla_due_at := old.sla_due_at;
    new.applicant_id := old.applicant_id;
    if old.status = 'need_more_info' then new.status := 'need_more_info'; end if;
  end if;
  return new;
end $$;
drop trigger if exists app_guard on public.applications;
create trigger app_guard before update on public.applications for each row execute function public.guard_application_update();

-- ---- profile ----
create or replace function public.set_my_language(p_lang text) returns void language sql security definer set search_path = public as $$
  update public.profiles set language = left(p_lang, 8) where id = auth.uid()
$$;
create or replace function public.set_my_name(p_name text) returns void language sql security definer set search_path = public as $$
  update public.profiles set name = left(trim(p_name), 80) where id = auth.uid() and trim(coalesce(p_name, '')) <> ''
$$;

-- ---- order: stock wapas ----
create or replace function public.restore_stock(p_items jsonb) returns void language plpgsql as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    update public.plants set stock = stock + (it->>'qty')::int where id = (it->>'plantId')::uuid;
  end loop;
end $$;

-- ---- order: dusri nursery ko do (same sku) ----
create or replace function public.reassign_order(p_id uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.settings; nxt public.nurseries; tried uuid[]; newitems jsonb; it jsonb;
begin
  select * into o from public.orders where id = p_id for update;
  if not found or o.status <> 'new' then return; end if;
  select * into s from public.settings where id = 1;
  perform public.restore_stock(o.items);
  tried := array_append(o.tried_nursery_ids, o.nursery_id);
  select n.* into nxt from public.nurseries n
   where n.status = 'active' and n.is_open and n.id <> all(tried)
     and not exists (
       select 1 from jsonb_array_elements(o.items) i
        where not exists (select 1 from public.plants p where p.nursery_id = n.id and p.sku = i->>'sku' and p.status = 'live' and p.stock >= (i->>'qty')::int))
   order by public.hav_km(n.lat, n.lng, o.lat, o.lng) limit 1;
  if not found then
    update public.orders set status = 'expired', tried_nursery_ids = tried, events = public.push_event(o.events, 'expired', p_note || ' - koi aur nursery nahi mili') where id = p_id;
    return;
  end if;
  select jsonb_agg(jsonb_set(i.v, '{plantId}', to_jsonb(p.id::text)) order by i.ord) into newitems
    from jsonb_array_elements(o.items) with ordinality as i(v, ord)
    join public.plants p on p.nursery_id = nxt.id and p.sku = i.v->>'sku';
  for it in select * from jsonb_array_elements(newitems) loop
    update public.plants set stock = stock - (it->>'qty')::int where id = (it->>'plantId')::uuid;
  end loop;
  update public.orders set nursery_id = nxt.id, nursery_brand = nxt.brand_name, status = 'new', items = newitems, tried_nursery_ids = tried,
         accept_by = now() + make_interval(secs => s.accept_seconds), events = public.push_event(o.events, 'reassigned', p_note || ' -> ' || nxt.brand_name)
   where id = p_id;
end $$;

-- ---- order place (cart ko nursery ke hisaab se baant kar) ----
create or replace function public.place_orders(p_lines jsonb, p_address text, p_pincode text, p_lat float8, p_lng float8, p_payment text, p_dp uuid default null)
returns setof public.orders language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; s public.settings; g record; l record; pl public.plants; nur public.nurseries; dp public.delivery_partners;
        items jsonb; sub numeric; km float8; fee numeric; ord public.orders;
begin
  if uid is null then raise exception 'Pehle login karo'; end if;
  select * into prof from public.profiles where id = uid;
  select * into s from public.settings where id = 1;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then raise exception 'Cart khali hai'; end if;
  if length(trim(coalesce(p_address, ''))) < 6 then raise exception 'Poora address daalo'; end if;
  if p_payment not in ('cod', 'upi') then raise exception 'Payment method galat'; end if;

  for g in select distinct p.nursery_id from jsonb_to_recordset(p_lines) as x("plantId" uuid, qty int) join public.plants p on p.id = x."plantId" loop
    select * into nur from public.nurseries where id = g.nursery_id;
    if not nur.is_open or nur.status <> 'active' then raise exception 'Ek nursery abhi band hai, cart se hata do'; end if;
    items := '[]'::jsonb; sub := 0;
    for l in select x."plantId" as pid, x.qty from jsonb_to_recordset(p_lines) as x("plantId" uuid, qty int) loop
      select * into pl from public.plants where id = l.pid for update;
      if pl.nursery_id <> g.nursery_id then continue; end if;
      if l.qty < 1 then raise exception 'Matra galat'; end if;
      if pl.status <> 'live' or pl.stock < l.qty then raise exception '% ka stock kam hai', coalesce(pl.name->>'en', pl.name->>'hi'); end if;
      update public.plants set stock = stock - l.qty where id = pl.id;
      items := items || jsonb_build_array(jsonb_build_object('plantId', pl.id, 'sku', pl.sku, 'name', coalesce(pl.name->>'en', pl.name->>'hi'), 'price', pl.price, 'qty', l.qty, 'image', pl.image));
      sub := sub + pl.price * l.qty;
    end loop;
    km := greatest(0.5, public.hav_km(nur.lat, nur.lng, p_lat, p_lng) * 1.3);
    if p_dp is not null then select * into dp from public.delivery_partners where id = p_dp and active;
    else select * into dp from public.delivery_partners where active order by greatest(min_charge, rate_per_km * km) limit 1; end if;
    fee := case when dp.id is null then 0 else round(greatest(dp.min_charge, dp.rate_per_km * km)) end;
    insert into public.orders(short_id, customer_id, customer_name, customer_phone, nursery_id, nursery_brand, items, subtotal, delivery_fee, total, payment_method,
                              delivery_partner_id, delivery_partner_name, address, pincode, lat, lng, cancel_until, accept_by, events)
    values ('NL' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)), uid, prof.name, coalesce(prof.phone, prof.email, ''), nur.id, nur.brand_name, items, sub, fee, sub + fee, p_payment,
            dp.id, dp.name, trim(p_address), coalesce(p_pincode, ''), p_lat, p_lng, now() + make_interval(secs => s.cancel_seconds), now() + make_interval(secs => s.accept_seconds),
            jsonb_build_array(jsonb_build_object('status', 'new', 'at', public.now_ms())))
    returning * into ord;
    return next ord;
  end loop;
  return;
end $$;

create or replace function public.customer_cancel_order(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id and customer_id = auth.uid() for update;
  if not found then raise exception 'Order nahi mila'; end if;
  if o.status <> 'new' or now() > o.cancel_until then raise exception 'Cancel ka time nikal gaya'; end if;
  perform public.restore_stock(o.items);
  update public.orders set status = 'cancelled', events = public.push_event(o.events, 'cancelled', 'Customer ne cancel kiya') where id = p_id;
end $$;

create or replace function public.partner_respond_order(p_id uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id and nursery_id = public.my_nursery_id() for update;
  if not found then raise exception 'Order nahi mila'; end if;
  if p_action = 'accept' then
    if o.status <> 'new' then raise exception 'Order ab accept nahi ho sakta'; end if;
    if now() > o.accept_by then raise exception 'Time khatam ho gaya'; end if;
    update public.orders set status = 'accepted', events = public.push_event(o.events, 'accepted') where id = p_id;
  elsif p_action = 'reject' then
    if o.status <> 'new' then raise exception 'Order ab reject nahi ho sakta'; end if;
    perform public.reassign_order(p_id, 'Nursery ne mana kiya');
  elsif p_action = 'packed' then
    if o.status <> 'accepted' then raise exception 'Pehle order accept karo'; end if;
    update public.orders set status = 'packed', events = public.push_event(o.events, 'packed') where id = p_id;
  else raise exception 'Galat action'; end if;
end $$;

create or replace function public.admin_advance_order(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; nx text;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into o from public.orders where id = p_id for update;
  nx := case o.status when 'new' then 'accepted' when 'accepted' then 'packed' when 'packed' then 'out_for_delivery' when 'out_for_delivery' then 'delivered' else null end;
  if nx is null then raise exception 'Is order ko aage nahi badha sakte'; end if;
  update public.orders set status = nx, events = public.push_event(o.events, nx, 'Admin') where id = p_id;
  perform public.audit_log('order_advance', o.short_id || ' -> ' || nx);
end $$;

create or replace function public.admin_cancel_order(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into o from public.orders where id = p_id for update;
  if o.status not in ('new', 'accepted', 'packed') then raise exception 'Ab cancel nahi ho sakta'; end if;
  perform public.restore_stock(o.items);
  update public.orders set status = 'cancelled', events = public.push_event(o.events, 'cancelled', 'Admin') where id = p_id;
  perform public.audit_log('order_cancel', o.short_id);
end $$;

-- pg_cron ya app har ~30 sec isko chalata hai: 5 min me jawab nahi to dusri nursery
create or replace function public.tick_orders() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders where status = 'new' and accept_by < now() limit 50 loop
    perform public.reassign_order(r.id, 'Accept time khatam'); n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.review_order(p_id uuid, p_rating int, p_comment text) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set rating = p_rating, review = left(coalesce(p_comment, ''), 500) where id = p_id and customer_id = auth.uid() and status = 'delivered' and rating is null;
  if not found then raise exception 'Rating nahi di ja sakti'; end if;
end $$;

create or replace function public.raise_complaint(p_order uuid, p_reason text, p_photo text default null) returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; dat timestamptz;
begin
  select * into o from public.orders where id = p_order and customer_id = auth.uid() and status = 'delivered';
  if not found then raise exception 'Replacement sirf delivered order par'; end if;
  select to_timestamp((e->>'at')::bigint / 1000.0) into dat from jsonb_array_elements(o.events) e where e->>'status' = 'delivered' order by (e->>'at')::bigint desc limit 1;
  if now() - coalesce(dat, o.created_at) > interval '7 days' then raise exception '7 din ka time khatam'; end if;
  insert into public.complaints(order_id, customer_id, reason, photo) values (p_order, auth.uid(), left(p_reason, 1000), p_photo);
end $$;

-- ---- partner ----
create or replace function public.set_shop_open(p_open boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.nurseries set is_open = p_open where id = public.my_nursery_id() and status = 'active';
  if not found then raise exception 'Nursery nahi mili ya block hai'; end if;
end $$;

create or replace function public.set_stock(p_plant uuid, p_stock int) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.plants set stock = greatest(0, p_stock) where id = p_plant and nursery_id = public.my_nursery_id();
  if not found then raise exception 'Product nahi mila'; end if;
end $$;

create or replace function public.partner_earnings() returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.settings; nid uuid := public.my_nursery_id(); sh numeric; n public.nurseries; res jsonb;
begin
  select * into s from public.settings where id = 1;
  select * into n from public.nurseries where id = nid;
  sh := coalesce((s.split->>'nursery')::numeric, 80) / 100;
  select jsonb_build_object(
    'today', coalesce(sum(subtotal * sh) filter (where status = 'delivered' and dat >= date_trunc('day', now())), 0),
    'month', coalesce(sum(subtotal * sh) filter (where status = 'delivered' and dat >= date_trunc('month', now())), 0),
    'pending', coalesce(sum(subtotal * sh) filter (where status in ('accepted', 'packed', 'out_for_delivery')), 0),
    'deliveredCount', count(*) filter (where status = 'delivered')) into res
  from (select o.status, o.subtotal, coalesce((select to_timestamp(max((e->>'at')::bigint) / 1000.0) from jsonb_array_elements(o.events) e where e->>'status' = 'delivered'), o.created_at) as dat
          from public.orders o where o.nursery_id = nid) q;
  if n.probation_ends_on is not null and n.probation_ends_on >= current_date then
    res := res || jsonb_build_object('holdNote', 'Naye partner ke payout ' || s.payout_hold_days || ' din baad milte hain');
  end if;
  return res;
end $$;

-- ---- application ----
create or replace function public.app_problems(a public.applications) returns text[] language plpgsql stable security definer set search_path = public as $$
declare r public.rules; p text[] := '{}'; d text;
begin
  select * into r from public.rules where partner_type = a.partner_type;
  if not exists (select 1 from jsonb_array_elements(a.docs) e where (e->>'type') = any(r.allowed_id_docs)) then p := p || 'Koi ek ID document chahiye'; end if;
  foreach d in array r.required_docs loop
    if not exists (select 1 from jsonb_array_elements(a.docs) e where e->>'type' = d) then p := p || ('Document chahiye: ' || d); end if;
  end loop;
  if r.licence_required then
    if trim(a.licence_no) = '' then p := p || 'Licence number chahiye'; end if;
    if a.licence_expiry = '' or a.licence_expiry < to_char(current_date, 'YYYY-MM-DD') then p := p || 'Licence ki expiry date chalu honi chahiye'; end if;
  end if;
  if r.gst_required and length(trim(a.gstin)) < 10 then p := p || 'GST number chahiye'; end if;
  return p;
end $$;

create or replace function public.submit_application() returns void language plpgsql security definer set search_path = public as $$
declare a public.applications; s public.settings; p text[];
begin
  select * into a from public.applications where applicant_id = auth.uid() and status in ('draft', 'need_more_info') order by created_at desc limit 1 for update;
  if not found then raise exception 'Pehle form bharo'; end if;
  select * into s from public.settings where id = 1;
  p := public.app_problems(a);
  if trim(a.shop_name) = '' then p := p || 'Dukaan/nursery ka naam'; end if;
  if trim(a.owner_name) = '' then p := p || 'Malik ka naam'; end if;
  if right(regexp_replace(a.phone, '\D', '', 'g'), 10) !~ '^[6-9][0-9]{9}$' then p := p || 'Sahi phone number'; end if;
  if length(trim(a.address)) < 6 then p := p || 'Poora address'; end if;
  if a.consent_at is null then p := p || 'Consent (sahmati)'; end if;
  if array_length(p, 1) > 0 then raise exception '%', array_to_string(p, ' | '); end if;
  update public.applications set status = 'submitted', submitted_at = now(), sla_due_at = now() + make_interval(hours => s.sla_hours), review_note = null where id = a.id;
end $$;

create or replace function public.approve_partner_application(p_id uuid, p_brand text) returns uuid language plpgsql security definer set search_path = public as $$
declare a public.applications; r public.rules; s public.settings; p text[]; nid uuid; k text;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into a from public.applications where id = p_id for update;
  if not found then raise exception 'Application nahi mili'; end if;
  if a.status not in ('submitted', 'under_review') then raise exception 'Ye application approve nahi ho sakti (status: %)', a.status; end if;
  if trim(coalesce(p_brand, '')) = '' then raise exception 'Brand name zaruri hai'; end if;
  select * into r from public.rules where partner_type = a.partner_type;
  select * into s from public.settings where id = 1;
  p := public.app_problems(a);
  foreach k in array array['id_checked', 'name_matches', 'geotag_ok', 'phone_call_done'] || case when r.licence_required then array['licence_checked'] else '{}'::text[] end
                       || case when r.gst_required then array['gst_checked'] else '{}'::text[] end loop
    if coalesce((a.checklist->>k)::boolean, false) is not true then p := p || ('Checklist baaki: ' || k); end if;
  end loop;
  if array_length(p, 1) > 0 then raise exception '%', array_to_string(p, ' | '); end if;
  insert into public.nurseries(partner_type, legal_name, brand_name, owner_phone, lat, lng, city, is_open, tier, probation_ends_on, licence_no, licence_expiry, gstin)
  values (a.partner_type, a.shop_name, trim(p_brand), right(regexp_replace(a.phone, '\D', '', 'g'), 10), coalesce(a.lat, 26.8467), coalesce(a.lng, 80.9462), a.city, false, 'new',
          current_date + s.probation_days, nullif(a.licence_no, ''), nullif(a.licence_expiry, '')::date, nullif(a.gstin, ''))
  returning id into nid;
  update public.profiles set role = 'partner', nursery_id = nid where id = a.applicant_id;
  update public.applications set status = 'approved', nursery_id = nid, reviewed_at = now() where id = a.id;
  perform public.audit_log('approve_application', a.shop_name || ' -> ' || nid::text);
  return nid;
end $$;

create or replace function public.log_doc_view(p_app uuid, p_doc text) returns void language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then perform public.audit_log('kyc_doc_viewed', p_app::text || ' / ' || p_doc); end if;
end $$;

grant execute on function public.place_orders(jsonb, text, text, float8, float8, text, uuid) to authenticated;
grant execute on function public.customer_cancel_order(uuid), public.partner_respond_order(uuid, text), public.admin_advance_order(uuid), public.admin_cancel_order(uuid),
  public.tick_orders(), public.review_order(uuid, int, text), public.raise_complaint(uuid, text, text), public.set_shop_open(boolean), public.set_stock(uuid, int),
  public.partner_earnings(), public.submit_application(), public.approve_partner_application(uuid, text), public.log_doc_view(uuid, text),
  public.set_my_language(text), public.set_my_name(text) to authenticated;
revoke execute on function public.reassign_order(uuid, text) from public, anon, authenticated;
-- ============================================================
-- Row Level Security + views + storage. Ye sabse zaruri hai: iske bina koi bhi data dekh/badal sakta hai.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.nurseries enable row level security;
alter table public.plants enable row level security;
alter table public.delivery_partners enable row level security;
alter table public.orders enable row level security;
alter table public.applications enable row level security;
alter table public.complaints enable row level security;
alter table public.rules enable row level security;
alter table public.settings enable row level security;
alter table public.audit enable row level security;

drop policy if exists p_profiles_self on public.profiles;
create policy p_profiles_self on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists p_nurseries_read on public.nurseries;
create policy p_nurseries_read on public.nurseries for select to authenticated using (id = public.my_nursery_id() or public.is_admin());
drop policy if exists p_nurseries_admin on public.nurseries;
create policy p_nurseries_admin on public.nurseries for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_plants_partner_read on public.plants;
create policy p_plants_partner_read on public.plants for select to authenticated using (nursery_id = public.my_nursery_id() or public.is_admin());
drop policy if exists p_plants_partner_insert on public.plants;
create policy p_plants_partner_insert on public.plants for insert to authenticated with check (nursery_id = public.my_nursery_id() and status = 'pending');
drop policy if exists p_plants_admin on public.plants;
create policy p_plants_admin on public.plants for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_dp_read on public.delivery_partners;
create policy p_dp_read on public.delivery_partners for select to anon, authenticated using (active or public.is_admin());
drop policy if exists p_dp_admin on public.delivery_partners;
create policy p_dp_admin on public.delivery_partners for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_orders_customer on public.orders;
create policy p_orders_customer on public.orders for select to authenticated using (customer_id = auth.uid() or public.is_admin());

drop policy if exists p_apps_own_read on public.applications;
create policy p_apps_own_read on public.applications for select to authenticated using (applicant_id = auth.uid() or public.is_admin());
drop policy if exists p_apps_own_insert on public.applications;
create policy p_apps_own_insert on public.applications for insert to authenticated with check (applicant_id = auth.uid() and status = 'draft');
drop policy if exists p_apps_own_update on public.applications;
create policy p_apps_own_update on public.applications for update to authenticated using (applicant_id = auth.uid() and status in ('draft', 'need_more_info')) with check (applicant_id = auth.uid());
drop policy if exists p_apps_admin on public.applications;
create policy p_apps_admin on public.applications for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_complaints_read on public.complaints;
create policy p_complaints_read on public.complaints for select to authenticated using (customer_id = auth.uid() or public.is_admin());
drop policy if exists p_complaints_admin on public.complaints;
create policy p_complaints_admin on public.complaints for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_rules_read on public.rules;
create policy p_rules_read on public.rules for select to anon, authenticated using (true);
drop policy if exists p_rules_admin on public.rules;
create policy p_rules_admin on public.rules for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_settings_read on public.settings;
create policy p_settings_read on public.settings for select to anon, authenticated using (true);
drop policy if exists p_settings_admin on public.settings;
create policy p_settings_admin on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_audit_admin on public.audit;
create policy p_audit_admin on public.audit for select to authenticated using (public.is_admin());

-- ---- Views (owner ke haq se chalte hain, isliye legal_name/customer phone chhupa kar sirf zaruri columns dete hain) ----
drop view if exists public.public_plants;
create or replace view public.public_plants as
select p.id, p.nursery_id, p.sku, p.name, p.category, p.price, p.stock, p.image, p.care, p.festival_tags, p.status, p.created_at,
       n.brand_name, n.partner_type as nursery_partner_type, n.tier, n.lat as nursery_lat, n.lng as nursery_lng
  from public.plants p join public.nurseries n on n.id = p.nursery_id
 where p.status = 'live' and n.status = 'active' and n.is_open;
grant select on public.public_plants to anon, authenticated;

create or replace view public.partner_orders as
select id, short_id, customer_id, ''::text as customer_name, ''::text as customer_phone, nursery_id, nursery_brand, tried_nursery_ids, items, subtotal, delivery_fee, total,
       payment_method, status, delivery_partner_id, delivery_partner_name, ''::text as address, ''::text as pincode, lat, lng, cancel_until, accept_by, created_at, events, rating, review
  from public.orders where nursery_id = public.my_nursery_id();
grant select on public.partner_orders to authenticated;

-- ---- Storage ----
insert into storage.buckets (id, name, public) values ('partner-docs', 'partner-docs', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('plant-images', 'plant-images', true) on conflict (id) do nothing;

drop policy if exists docs_owner on storage.objects;
create policy docs_owner on storage.objects for all to authenticated
  using (bucket_id = 'partner-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'partner-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists docs_admin_read on storage.objects;
create policy docs_admin_read on storage.objects for select to authenticated using (bucket_id = 'partner-docs' and public.is_admin());
drop policy if exists plant_img_read on storage.objects;
create policy plant_img_read on storage.objects for select to anon, authenticated using (bucket_id = 'plant-images');
drop policy if exists plant_img_write on storage.objects;
create policy plant_img_write on storage.objects for insert to authenticated with check (bucket_id = 'plant-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists plant_img_update on storage.objects;
create policy plant_img_update on storage.objects for update to authenticated using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = auth.uid()::text);
-- Starting data: partner rules, settings, delivery partners. Baad me Office app se badal sakte ho.
insert into public.settings(id) values (1) on conflict (id) do nothing;

insert into public.rules(partner_type, allowed_id_docs, required_docs, licence_required, gst_required, allowed_categories, max_live_probation) values
 ('at_home', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{selfie,home_garden_photo}', false, false, '{indoor,outdoor,flowering,succulent,medicinal,seeds,pots}', 20),
 ('nursery', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{shop_photo_front,shop_photo_inside}', false, false, '{indoor,outdoor,flowering,succulent,medicinal,seeds,pots,tools,soil_manure}', 20),
 ('fertilizer_shop', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{shop_photo_front,shop_photo_inside,fertilizer_licence}', true, true, '{soil_manure,tools,pots}', 20),
 ('seed_shop', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{shop_photo_front,shop_photo_inside}', false, true, '{seeds,tools}', 20)
on conflict (partner_type) do nothing;

insert into public.delivery_partners(name, rate_per_km, min_charge, vehicle_types, active, deep_link)
select * from (values
  ('Porter', 9, 60, '{bike,3w,ace}'::text[], true, 'https://porter.in/'),
  ('Shadowfax', 8, 55, '{bike}'::text[], true, null),
  ('Borzo', 10, 70, '{bike,ace}'::text[], true, null),
  ('Rapido', 7, 40, '{bike}'::text[], true, null)
) v(name, r, m, v2, a, d)
where not exists (select 1 from public.delivery_partners);
-- Part 1: multi-category, ribbon, editable categories, slideshows. Dobara chalane par bhi safe.
alter table public.plants add column if not exists categories text[] not null default '{}';
alter table public.plants add column if not exists ribbon text;
update public.plants set categories = array[category] where coalesce(array_length(categories,1),0) = 0;

create table if not exists public.categories (
  key text primary key,
  name jsonb not null default '{}'::jsonb,
  emoji text not null default '🌱',
  active boolean not null default true,
  sort_order int not null default 0
);
create table if not exists public.slideshows (
  id text primary key,
  data jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
alter table public.slideshows enable row level security;
drop policy if exists p_cat_read on public.categories;
create policy p_cat_read on public.categories for select to anon, authenticated using (active or public.is_admin());
drop policy if exists p_cat_admin on public.categories;
create policy p_cat_admin on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_ss_read on public.slideshows;
create policy p_ss_read on public.slideshows for select to anon, authenticated using (enabled or public.is_admin());
drop policy if exists p_ss_admin on public.slideshows;
create policy p_ss_admin on public.slideshows for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.categories (key, name, emoji, sort_order) values
 ('indoor','{"en":"Indoor","hi":"इनडोर"}','🪴',1),('outdoor','{"en":"Outdoor","hi":"आउटडोर"}','🌳',2),
 ('flowering','{"en":"Flowering","hi":"फूल वाले"}','🌸',3),('succulent','{"en":"Succulent","hi":"सक्यूलेंट"}','🌵',4),
 ('medicinal','{"en":"Medicinal","hi":"औषधीय"}','🌿',5),('seeds','{"en":"Seeds","hi":"बीज"}','🌱',6),
 ('pots','{"en":"Pots","hi":"गमले"}','🏺',7),('tools','{"en":"Tools","hi":"औज़ार"}','🛠️',8),
 ('soil_manure','{"en":"Soil & Manure","hi":"मिट्टी व खाद"}','🧺',9)
on conflict (key) do nothing;
update public.categories set name = '{"en":"Succulent","hi":"सक्यूलेंट"}' where key = 'succulent';

drop view if exists public.public_plants;
create or replace view public.public_plants as
select p.id, p.nursery_id, p.sku, p.name, p.category, p.categories, p.ribbon, p.price, p.stock, p.image, p.care, p.festival_tags, p.status, p.created_at,
       n.brand_name, n.partner_type as nursery_partner_type, n.tier, n.lat as nursery_lat, n.lng as nursery_lng
  from public.plants p join public.nurseries n on n.id = p.nursery_id
 where p.status = 'live' and n.status = 'active' and n.is_open;
grant select on public.public_plants to anon, authenticated;
-- Part 2: Form Builder + Leads. Dobara chalane par bhi safe.
create table if not exists public.forms (
  id text primary key,
  data jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  form_id text not null,
  form_name text not null default '',
  name text not null,
  phone text not null,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new','called','confirmed','done','rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_status_idx on public.leads(status, created_at desc);

alter table public.forms enable row level security;
alter table public.leads enable row level security;
drop policy if exists p_forms_read on public.forms;
create policy p_forms_read on public.forms for select to anon, authenticated using (enabled or public.is_admin());
drop policy if exists p_forms_admin on public.forms;
create policy p_forms_admin on public.forms for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Leads: sirf admin padh/badal sakta hai. Partner ko kabhi nahi. Customer sirf submit_lead() se bhej sakta hai.
drop policy if exists p_leads_admin on public.leads;
create policy p_leads_admin on public.leads for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_lead(p_form text, p_name text, p_phone text, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare f record; fld jsonb; v text; ph text; out jsonb := '[]'::jsonb; lbl text;
begin
  select * into f from public.forms where id = p_form and enabled;
  if not found then raise exception 'Ye form abhi band hai'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Apna naam daalo'; end if;
  ph := right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10);
  if ph !~ '^[6-9][0-9]{9}$' then raise exception 'Sahi 10 ank ka mobile number daalo'; end if;
  if coalesce(octet_length(p_answers::text), 0) > 600000 then raise exception 'Jawab bahut bade hain'; end if;
  for fld in select * from jsonb_array_elements(f.data->'fields') loop
    v := trim(coalesce((select a->>'value' from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) a where a->>'id' = fld->>'id' limit 1), ''));
    lbl := coalesce(fld->'label'->>'en', fld->'label'->>'hi', fld->>'id');
    if coalesce((fld->>'required')::boolean, false) and v = '' then raise exception 'Zaruri jawab bharo: %', lbl; end if;
    if v <> '' then out := out || jsonb_build_array(jsonb_build_object('id', fld->>'id', 'label', lbl, 'type', fld->>'type', 'value', v)); end if;
  end loop;
  insert into public.leads (form_id, form_name, name, phone, answers) values (f.id, coalesce(f.data->>'name',''), trim(p_name), ph, out);
end $$;
revoke all on function public.submit_lead(text, text, text, jsonb) from public;
grant execute on function public.submit_lead(text, text, text, jsonb) to anon, authenticated;

do $$ begin alter publication supabase_realtime add table public.leads; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.forms; exception when others then null; end $$;

insert into public.forms (id, data, enabled) values ('form_ask', '{
 "id":"form_ask","name":"App puchh lo","enabled":true,"placement":"bottom","emoji":"💬",
 "buttonText":{"en":"Ask us anything","hi":"App पूछ लो"},"buttonSub":{"en":"Tell us what you need, we will call you","hi":"अपनी ज़रूरत बताइए, हम आपको कॉल करेंगे"},
 "title":{"en":"Tell us what you need","hi":"अपनी ज़रूरत बताइए"},"description":{"en":"Our team will call you shortly.","hi":"हमारी टीम जल्दी आपको कॉल करेगी।"},
 "successText":{"en":"Thank you! We will call you soon.","hi":"धन्यवाद! हम जल्दी आपको कॉल करेंगे।"},
 "fields":[
  {"id":"need","type":"select","required":true,"label":{"en":"What do you need?","hi":"आपको क्या चाहिए?"},"options":[{"en":"Help choosing plants","hi":"पौधे चुनने में मदद"},{"en":"Garden design","hi":"गार्डन डिज़ाइन"},{"en":"NGO / bulk order","hi":"NGO / बल्क ऑर्डर"},{"en":"Something else","hi":"कुछ और"}]},
  {"id":"details","type":"textarea","required":false,"label":{"en":"Details","hi":"विवरण"}},
  {"id":"when","type":"date","required":false,"label":{"en":"Preferred date","hi":"पसंदीदा तारीख"}},
  {"id":"pic","type":"photo","required":false,"label":{"en":"Photo (optional)","hi":"फोटो (वैकल्पिक)"}}
 ]}'::jsonb, true) on conflict (id) do nothing;

-- Part 3: naye partner types (decorator, gardener, flower_shop, flower_vendor) + service bookings
-- (gardener / decoration / bulk). Dobara chalane par bhi safe.

-- ---------- 1. naye partner types ----------
alter table public.nurseries drop constraint if exists nurseries_partner_type_check;
alter table public.nurseries add constraint nurseries_partner_type_check check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop','decorator','gardener','flower_shop','flower_vendor'));
alter table public.applications drop constraint if exists applications_partner_type_check;
alter table public.applications add constraint applications_partner_type_check check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop','decorator','gardener','flower_shop','flower_vendor'));
alter table public.rules drop constraint if exists rules_partner_type_check;
alter table public.rules add constraint rules_partner_type_check check (partner_type in ('at_home','nursery','fertilizer_shop','seed_shop','decorator','gardener','flower_shop','flower_vendor'));

alter table public.nurseries add column if not exists starting_price numeric;
alter table public.nurseries add column if not exists service_radius_km numeric;
alter table public.nurseries add column if not exists bio text not null default '';
alter table public.nurseries add column if not exists blocked_dates text[] not null default '{}';
alter table public.nurseries add column if not exists priority int not null default 0;

alter table public.settings add column if not exists confirm_hours int not null default 24;
alter table public.settings add column if not exists refund_72 int not null default 80;
alter table public.settings add column if not exists refund_24 int not null default 50;
alter table public.settings add column if not exists refund_low int not null default 0;

insert into public.rules(partner_type, allowed_id_docs, required_docs, licence_required, gst_required, allowed_categories, max_live_probation) values
 ('flower_shop', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{shop_photo_front,shop_photo_inside}', false, false, '{flowers,bouquet,mala,flowering,pots}', 20),
 ('flower_vendor', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{selfie,shop_photo_front}', false, false, '{flowers,mala,bouquet}', 20),
 ('gardener', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{selfie}', false, false, '{}', 0),
 ('decorator', '{aadhaar_masked,pan,residence_certificate,driving_licence,passport,voter_id}', '{selfie,shop_photo_front}', false, false, '{}', 0)
on conflict (partner_type) do nothing;

insert into public.categories (key, name, emoji, sort_order) values
 ('flowers','{"en":"Flowers","hi":"फूल"}','💐',10),('bouquet','{"en":"Bouquet","hi":"बुके"}','🌹',11),('mala','{"en":"Mala / Garland","hi":"माला"}','📿',12)
on conflict (key) do nothing;

-- ---------- 2. services ----------
create table if not exists public.services (
  key text primary key,
  kind text not null check (kind in ('gardener','decor','bulk')),
  name jsonb not null default '{}'::jsonb,
  sub jsonb not null default '{}'::jsonb,
  emoji text not null default '🧰',
  starting_price numeric not null default 0,
  token_percent int not null default 20 check (token_percent between 0 and 100),
  min_notice_hours int not null default 12 check (min_notice_hours >= 0),
  daily_capacity int not null default 5 check (daily_capacity >= 1),
  commission_percent int not null default 10 check (commission_percent between 0 and 100),
  needs_time boolean not null default true,
  enabled boolean not null default true,
  sort_order int not null default 0
);
alter table public.services enable row level security;
drop policy if exists p_services_read on public.services;
create policy p_services_read on public.services for select to anon, authenticated using (enabled or public.is_admin());
drop policy if exists p_services_admin on public.services;
create policy p_services_admin on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.services (key, kind, name, sub, emoji, starting_price, token_percent, min_notice_hours, daily_capacity, commission_percent, needs_time, sort_order) values
 ('gardener','gardener','{"en":"Hire a Gardener","hi":"माली बुलाएँ"}','{"en":"Trimming, lawn, pots, garden care","hi":"छँटाई, लॉन, गमले, बगीचे की देखभाल"}','🧑‍🌾',500,20,12,6,10,true,1),
 ('decor','decor','{"en":"Event Decoration","hi":"इवेंट सजावट"}','{"en":"Wedding, birthday, puja & home functions","hi":"शादी, जन्मदिन, पूजा और घर के कार्यक्रम"}','🎊',5000,25,72,3,10,true,2),
 ('bulk','bulk','{"en":"Bulk / Event Order","hi":"बल्क / इवेंट ऑर्डर"}','{"en":"Many plants or flowers for an event, NGO or office","hi":"इवेंट, NGO या ऑफिस के लिए ढेर सारे पौधे या फूल"}','📦',2000,30,48,5,10,false,3)
on conflict (key) do nothing;

-- ---------- 3. bookings ----------
create sequence if not exists public.booking_seq start 1001;
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null,
  service_key text not null references public.services(key),
  service_name text not null default '',
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  date date not null,
  time text not null default '',
  venue text not null,
  pincode text not null default '',
  lat float8,
  lng float8,
  remarks text not null default '',
  photo text,
  status text not null default 'new' check (status in ('new','called','confirmed','token_paid','done','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_due_at timestamptz not null,
  called_at timestamptz,
  agreed_amount numeric not null default 0,
  token_percent int not null default 0,
  token_amount numeric not null default 0,
  token_claimed_at timestamptz,
  token_paid_at timestamptz,
  handler text not null default 'owner' check (handler in ('owner','provider')),
  provider_id uuid references public.nurseries(id) on delete set null,
  provider_brand text,
  provider_state text check (provider_state in ('assigned','accepted','declined')),
  commission_percent int not null default 0,
  refund_amount numeric,
  cancelled_by text check (cancelled_by in ('customer','owner','provider')),
  cancel_reason text,
  note text not null default '',
  events jsonb not null default '[]'::jsonb
);
create index if not exists bookings_status_idx on public.bookings(status, created_at desc);
create index if not exists bookings_day_idx on public.bookings(service_key, date) where status in ('token_paid','done');
create index if not exists bookings_provider_idx on public.bookings(provider_id);
-- Booking sirf admin direct padh/badal sakta hai. Customer/partner sirf neeche ke functions/view se (privacy).
alter table public.bookings enable row level security;
drop policy if exists p_bookings_admin on public.bookings;
create policy p_bookings_admin on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 4. helpers ----------
create or replace function public.bk_start(p_date date, p_time text) returns timestamptz language sql immutable as $$
  select ((p_date::text || ' ' || coalesce(nullif(p_time, ''), '23:59'))::timestamp) at time zone 'Asia/Kolkata'
$$;
create or replace function public.bk_event(p_text text) returns jsonb language sql stable as $$
  select jsonb_build_array(jsonb_build_object('at', public.now_ms(), 'text', p_text))
$$;
-- refund: provider/owner cancel = poora; customer cancel = timing ke hisab se % (settings)
create or replace function public.bk_refund(b public.bookings, p_by text) returns numeric language plpgsql stable as $$
declare s public.settings; hrs numeric; pct int;
begin
  if b.token_paid_at is null then return 0; end if;
  if p_by <> 'customer' then return b.token_amount; end if;
  select * into s from public.settings where id = 1;
  hrs := extract(epoch from (public.bk_start(b.date, b.time) - now())) / 3600;
  pct := case when hrs >= 72 then s.refund_72 when hrs >= 24 then s.refund_24 else s.refund_low end;
  return round(b.token_amount * pct / 100.0);
end $$;

create or replace function public.booking_availability(p_service text, p_date date, p_time text default '')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.services; booked int; l int; mind date; ok boolean := true; why text;
begin
  select * into s from public.services where key = p_service;
  if not found then return jsonb_build_object('ok', false, 'reason', 'past', 'left', 0, 'minDate', to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD')); end if;
  mind := ((now() + make_interval(hours => s.min_notice_hours)) at time zone 'Asia/Kolkata')::date;
  select count(*) into booked from public.bookings where service_key = p_service and date = p_date and status in ('token_paid','done');
  l := greatest(0, s.daily_capacity - booked);
  if p_date < (now() at time zone 'Asia/Kolkata')::date then ok := false; why := 'past';
  elsif public.bk_start(p_date, p_time) < now() + make_interval(hours => s.min_notice_hours) then ok := false; why := 'notice';
  elsif l <= 0 then ok := false; why := 'full'; end if;
  return jsonb_strip_nulls(jsonb_build_object('ok', ok, 'reason', why, 'left', l, 'minDate', to_char(mind, 'YYYY-MM-DD')));
end $$;
revoke all on function public.booking_availability(text, date, text) from public;
grant execute on function public.booking_availability(text, date, text) to anon, authenticated;

-- ---------- 5. customer functions ----------
create or replace function public.submit_booking(p_service text, p_name text, p_phone text, p_date date, p_time text, p_venue text, p_pincode text,
  p_remarks text, p_photo text, p_lat float8, p_lng float8) returns text language plpgsql security definer set search_path = public as $$
declare s public.services; st public.settings; av jsonb; ph text; sid text; uid uuid;
begin
  select * into s from public.services where key = p_service and enabled;
  if not found then raise exception 'Ye service abhi band hai'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Apna naam daalo'; end if;
  ph := right(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), 10);
  if ph !~ '^[6-9][0-9]{9}$' then raise exception 'Sahi 10 ank ka mobile number daalo'; end if;
  if p_date is null then raise exception 'Tareekh chuno'; end if;
  if s.needs_time and coalesce(p_time,'') = '' then raise exception 'Time chuno'; end if;
  if length(trim(coalesce(p_venue,''))) < 6 then raise exception 'Jagah (venue) ka address daalo'; end if;
  if coalesce(p_pincode,'') <> '' and trim(p_pincode) !~ '^[0-9]{6}$' then raise exception 'Pincode 6 ank ka hona chahiye'; end if;
  if coalesce(length(p_photo), 0) > 140000 then raise exception 'Photo 100 KB se chhoti honi chahiye'; end if;
  av := public.booking_availability(p_service, p_date, case when s.needs_time then p_time else '' end);
  if not (av->>'ok')::boolean then
    raise exception '%', case av->>'reason' when 'full' then 'Is din ki booking poori hai, dusri tareekh chuno' when 'past' then 'Beeti hui tareekh nahi chalegi'
      else 'Is service ke liye kam se kam ' || s.min_notice_hours || ' ghante pehle booking chahiye (' || (av->>'minDate') || ' ya baad)' end;
  end if;
  select * into st from public.settings where id = 1;
  select id into uid from public.profiles where id = auth.uid() and role = 'customer';
  sid := 'BK' || nextval('public.booking_seq');
  insert into public.bookings (short_id, service_key, service_name, customer_id, customer_name, customer_phone, date, time, venue, pincode, lat, lng, remarks, photo,
    owner_due_at, token_percent, commission_percent, events)
  values (sid, s.key, coalesce(s.name->>'en', s.key), uid, trim(p_name), ph, p_date, case when s.needs_time then p_time else '' end, trim(p_venue), trim(coalesce(p_pincode,'')), p_lat, p_lng,
    trim(coalesce(p_remarks,'')), nullif(p_photo,''), now() + make_interval(hours => st.confirm_hours), s.token_percent, s.commission_percent, public.bk_event('Request mili (sirf owner ko)'));
  return sid;
end $$;
revoke all on function public.submit_booking(text, text, text, date, text, text, text, text, text, float8, float8) from public;
grant execute on function public.submit_booking(text, text, text, date, text, text, text, text, text, float8, float8) to anon, authenticated;

-- Customer apni booking dekhe: provider ka naam/number sirf confirm hone ke baad; note/commission kabhi nahi.
create or replace function public.my_bookings() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by (x->>'created_at') desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', b.id, 'short_id', b.short_id, 'service_key', b.service_key, 'service_name', b.service_name, 'customer_name', b.customer_name, 'customer_phone', b.customer_phone,
      'date', b.date, 'time', b.time, 'venue', b.venue, 'pincode', b.pincode, 'remarks', b.remarks, 'photo', b.photo, 'status', b.status,
      'created_at', b.created_at, 'updated_at', b.updated_at, 'owner_due_at', b.owner_due_at, 'called_at', b.called_at, 'agreed_amount', b.agreed_amount,
      'token_percent', b.token_percent, 'token_amount', b.token_amount, 'token_claimed_at', b.token_claimed_at, 'token_paid_at', b.token_paid_at,
      'handler', b.handler, 'refund_amount', b.refund_amount, 'cancelled_by', b.cancelled_by, 'cancel_reason', b.cancel_reason,
      'provider_brand', case when b.handler = 'provider' and b.status in ('confirmed','token_paid','done') then n.brand_name end,
      'provider_phone', case when b.handler = 'provider' and b.status in ('confirmed','token_paid','done') then n.owner_phone end
    ) as x
    from public.bookings b left join public.nurseries n on n.id = b.provider_id
    where auth.uid() is not null and (b.customer_id = auth.uid()
       or b.customer_phone = (select p.phone from public.profiles p where p.id = auth.uid() and p.phone is not null))
  ) q
$$;
revoke all on function public.my_bookings() from public, anon;
grant execute on function public.my_bookings() to authenticated;

create or replace function public.cancel_my_booking(p_id uuid) returns numeric language plpgsql security definer set search_path = public as $$
declare b public.bookings; r numeric;
begin
  select * into b from public.bookings where id = p_id
    and (customer_id = auth.uid() or customer_phone = (select phone from public.profiles where id = auth.uid() and phone is not null)) for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status in ('done','cancelled') then raise exception 'Ye booking pehle hi band ho chuki hai'; end if;
  r := public.bk_refund(b, 'customer');
  update public.bookings set status = 'cancelled', cancelled_by = 'customer', cancel_reason = 'Customer ne cancel kiya', refund_amount = r, updated_at = now(),
    events = events || public.bk_event('Cancel (customer)' || case when b.token_paid_at is not null then ' | refund ' || r else '' end) where id = p_id;
  perform public.audit_log('booking_cancel', b.short_id || ' by customer refund ' || r);
  return r;
end $$;
revoke all on function public.cancel_my_booking(uuid) from public, anon;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

create or replace function public.claim_token_paid(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_id
    and (customer_id = auth.uid() or customer_phone = (select phone from public.profiles where id = auth.uid() and phone is not null)) for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status <> 'confirmed' then raise exception 'Token abhi nahi maanga gaya'; end if;
  update public.bookings set token_claimed_at = now(), updated_at = now(), events = events || public.bk_event('Customer ne bataya: token de diya') where id = p_id;
end $$;
revoke all on function public.claim_token_paid(uuid) from public, anon;
grant execute on function public.claim_token_paid(uuid) to authenticated;

-- ---------- 6. admin functions ----------
create or replace function public.admin_booking_called(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status <> 'new' then raise exception 'Ye booking "new" nahi hai'; end if;
  update public.bookings set status = 'called', called_at = now(), updated_at = now(), events = events || public.bk_event('Owner ne customer se baat ki') where id = p_id;
  perform public.audit_log('booking_called', b.short_id);
end $$;

create or replace function public.admin_booking_confirm(p_id uuid, p_amount numeric) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; tok numeric;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status not in ('new','called') then raise exception 'Ye booking ab confirm nahi ho sakti'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'Tay hui rakam (amount) daalo'; end if;
  tok := round(round(p_amount) * b.token_percent / 100.0);
  update public.bookings set status = 'confirmed', agreed_amount = round(p_amount), token_amount = tok, called_at = coalesce(called_at, now()), updated_at = now(),
    events = events || public.bk_event('Confirm: ₹' || round(p_amount) || ', token ₹' || tok || ' (' || b.token_percent || '%)') where id = p_id;
  perform public.audit_log('booking_confirm', b.short_id || ' ' || round(p_amount));
end $$;

create or replace function public.admin_booking_token_paid(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; s public.services; booked int;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status <> 'confirmed' then raise exception 'Pehle booking confirm karo'; end if;
  select * into s from public.services where key = b.service_key;
  select count(*) into booked from public.bookings where service_key = b.service_key and date = b.date and status in ('token_paid','done') and id <> b.id;
  if booked >= s.daily_capacity then raise exception 'Is din ki limit poori ho chuki hai (dusri booking ka token pehle aa gaya)'; end if;
  update public.bookings set status = 'token_paid', token_paid_at = now(), updated_at = now(), events = events || public.bk_event('Token mila ₹' || b.token_amount || ' - tareekh pakki') where id = p_id;
  perform public.audit_log('booking_token_paid', b.short_id);
end $$;

create or replace function public.admin_booking_assign(p_id uuid, p_provider uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; n public.nurseries; s public.services;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status in ('done','cancelled') then raise exception 'Ye booking band ho chuki hai'; end if;
  if p_provider is null then
    update public.bookings set handler = 'owner', provider_id = null, provider_brand = null, provider_state = null, updated_at = now(), events = events || public.bk_event('Kaam owner ke paas hi rakha') where id = p_id;
  else
    select * into n from public.nurseries where id = p_provider and status = 'active';
    select * into s from public.services where key = b.service_key;
    if not found or n.id is null or not (
      (s.kind = 'gardener' and n.partner_type = 'gardener') or (s.kind = 'decor' and n.partner_type = 'decorator')
      or (s.kind = 'bulk' and n.partner_type in ('nursery','at_home','flower_shop','flower_vendor','seed_shop','fertilizer_shop'))) then
      raise exception 'Ye partner is service ke liye sahi nahi hai';
    end if;
    update public.bookings set handler = 'provider', provider_id = n.id, provider_brand = n.brand_name, provider_state = 'assigned', updated_at = now(),
      events = events || public.bk_event('Local provider ko diya: ' || n.brand_name) where id = p_id;
  end if;
  perform public.audit_log('booking_assign', b.short_id || ' -> ' || coalesce(p_provider::text, 'owner'));
end $$;

create or replace function public.admin_booking_done(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status <> 'token_paid' then raise exception 'Token aane ke baad hi poora mark ho sakta hai'; end if;
  update public.bookings set status = 'done', updated_at = now(), events = events || public.bk_event('Kaam poora') where id = p_id;
  perform public.audit_log('booking_done', b.short_id);
end $$;

create or replace function public.admin_booking_cancel(p_id uuid, p_by text, p_reason text) returns numeric language plpgsql security definer set search_path = public as $$
declare b public.bookings; r numeric;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  if p_by not in ('customer','owner','provider') then raise exception 'Kisne cancel kiya?'; end if;
  if length(trim(coalesce(p_reason,''))) = 0 then raise exception 'Cancel ka reason likho'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status in ('done','cancelled') then raise exception 'Ye booking pehle hi band ho chuki hai'; end if;
  r := public.bk_refund(b, p_by);
  update public.bookings set status = 'cancelled', cancelled_by = p_by, cancel_reason = trim(p_reason), refund_amount = r, updated_at = now(),
    events = events || public.bk_event('Cancel (' || p_by || '): ' || trim(p_reason) || case when b.token_paid_at is not null then ' | refund ₹' || r else '' end) where id = p_id;
  perform public.audit_log('booking_cancel', b.short_id || ' by ' || p_by || ' refund ' || r);
  return r;
end $$;

-- Admin booking ki details badle (jo customer ne bhari). Har badlav audit me.
create or replace function public.admin_update_booking(p_id uuid, p_patch jsonb) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; k text; changed text[] := '{}';
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_id for update;
  if not found then raise exception 'Booking nahi mili'; end if;
  if b.status in ('done','cancelled') then raise exception 'Ye booking band ho chuki hai'; end if;
  if p_patch ? 'customerPhone' and right(regexp_replace(p_patch->>'customerPhone','\D','','g'),10) !~ '^[6-9][0-9]{9}$' then raise exception 'Sahi mobile number daalo'; end if;
  if p_patch ? 'agreedAmount' and (p_patch->>'agreedAmount')::numeric < 0 then raise exception 'Sahi amount daalo'; end if;
  update public.bookings set
    customer_name = coalesce(p_patch->>'customerName', customer_name),
    customer_phone = coalesce(right(regexp_replace(p_patch->>'customerPhone','\D','','g'),10), customer_phone),
    date = coalesce((p_patch->>'date')::date, date), time = coalesce(p_patch->>'time', time), venue = coalesce(p_patch->>'venue', venue),
    pincode = coalesce(p_patch->>'pincode', pincode), remarks = coalesce(p_patch->>'remarks', remarks), note = coalesce(p_patch->>'note', note),
    agreed_amount = coalesce(round((p_patch->>'agreedAmount')::numeric), agreed_amount),
    token_amount = case when p_patch ? 'agreedAmount' and status not in ('new','called') then round(round((p_patch->>'agreedAmount')::numeric) * token_percent / 100.0) else token_amount end,
    updated_at = now(), events = events || public.bk_event('Admin ne badla: ' || (select string_agg(x, ', ') from jsonb_object_keys(p_patch) x))
  where id = p_id;
  perform public.audit_log('booking_edit', b.short_id || ' ' || (select string_agg(x, ',') from jsonb_object_keys(p_patch) x));
end $$;

-- Nearest/priority wale providers: owner ki priority pehle, phir doori.
create or replace function public.admin_providers_for(p_booking uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b public.bookings; s public.services; types text[]; lat0 float8; lng0 float8;
begin
  if not public.is_admin() then raise exception 'Permission nahi'; end if;
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'Booking nahi mili'; end if;
  select * into s from public.services where key = b.service_key;
  types := case s.kind when 'gardener' then array['gardener'] when 'decor' then array['decorator']
    else array['nursery','at_home','flower_shop','flower_vendor','seed_shop','fertilizer_shop'] end;
  lat0 := coalesce(b.lat, 26.8467); lng0 := coalesce(b.lng, 80.9462);
  return coalesce((select jsonb_agg(o order by (o->>'priority')::int desc, (o->>'distanceKm')::numeric asc) from (
    select jsonb_build_object('id', n.id, 'brand', n.brand_name, 'partnerType', n.partner_type,
      'distanceKm', round((111.2 * sqrt(power(n.lat - lat0, 2) + power((n.lng - lng0) * cos(radians(lat0)), 2)) * 1.3)::numeric, 1),
      'priority', n.priority, 'isOpen', n.is_open, 'startingPrice', n.starting_price, 'radiusKm', n.service_radius_km,
      'busy', (b.date::text = any(n.blocked_dates)) or exists (select 1 from public.bookings x where x.id <> b.id and x.provider_id = n.id and x.date = b.date and x.status = 'token_paid')) as o
    from public.nurseries n where n.status = 'active' and n.partner_type = any(types)) q), '[]'::jsonb);
end $$;

-- ---------- 7. partner: jobs (customer ka naam/number NAHI) ----------
create or replace view public.partner_jobs as
select b.id, b.short_id, b.service_key, b.service_name, b.date, b.time, b.venue, b.pincode, b.remarks, b.photo, b.status,
       coalesce(b.provider_state, 'assigned') as provider_state, (b.token_paid_at is not null) as token_paid,
       round(b.agreed_amount * (100 - b.commission_percent) / 100.0) as amount, b.created_at
  from public.bookings b where b.provider_id = public.my_nursery_id() and b.handler = 'provider';
grant select on public.partner_jobs to authenticated;

create or replace function public.respond_job(p_id uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; n public.nurseries;
begin
  select * into n from public.nurseries where id = public.my_nursery_id();
  select * into b from public.bookings where id = p_id and provider_id = n.id and handler = 'provider' for update;
  if not found then raise exception 'Kaam nahi mila'; end if;
  if p_action = 'accept' then
    if b.provider_state <> 'assigned' or b.status = 'cancelled' then raise exception 'Ab accept nahi ho sakta'; end if;
    update public.bookings set provider_state = 'accepted', updated_at = now(), events = events || public.bk_event(n.brand_name || ' ne kaam accept kiya') where id = p_id;
  elsif p_action = 'decline' then
    if b.status in ('done','cancelled') then raise exception 'Ab mana nahi kar sakte'; end if;
    update public.bookings set handler = 'owner', provider_id = null, provider_brand = null, provider_state = null, updated_at = now(),
      events = events || public.bk_event(n.brand_name || ' ne mana kiya, kaam owner ke paas wapas') where id = p_id;
  elsif p_action = 'done' then
    if b.provider_state <> 'accepted' then raise exception 'Pehle kaam accept karo'; end if;
    if b.status <> 'token_paid' then raise exception 'Token aane ke baad hi kaam poora mark ho sakta hai'; end if;
    update public.bookings set status = 'done', updated_at = now(), events = events || public.bk_event('Provider ne kaam poora mark kiya') where id = p_id;
  else raise exception 'Galat action'; end if;
end $$;

create or replace function public.update_my_profile(p_patch jsonb) returns void language plpgsql security definer set search_path = public as $$
declare nid uuid := public.my_nursery_id(); bd text[];
begin
  if nid is null then raise exception 'Profile nahi mili'; end if;
  if p_patch ? 'startingPrice' and (p_patch->>'startingPrice')::numeric < 0 then raise exception 'Sahi price daalo'; end if;
  if p_patch ? 'serviceRadiusKm' and (p_patch->>'serviceRadiusKm')::numeric < 0 then raise exception 'Sahi km daalo'; end if;
  if p_patch ? 'blockedDates' then
    select coalesce(array_agg(distinct d order by d), '{}') into bd from jsonb_array_elements_text(p_patch->'blockedDates') d where d ~ '^\d{4}-\d{2}-\d{2}$';
  end if;
  update public.nurseries set
    starting_price = case when p_patch ? 'startingPrice' then (p_patch->>'startingPrice')::numeric else starting_price end,
    service_radius_km = case when p_patch ? 'serviceRadiusKm' then (p_patch->>'serviceRadiusKm')::numeric else service_radius_km end,
    bio = case when p_patch ? 'bio' then left(p_patch->>'bio', 300) else bio end,
    blocked_dates = case when p_patch ? 'blockedDates' then bd else blocked_dates end
  where id = nid;
  perform public.audit_log('provider_profile', nid::text);
end $$;
revoke all on function public.respond_job(uuid, text) from public, anon;
revoke all on function public.update_my_profile(jsonb) from public, anon;
grant execute on function public.respond_job(uuid, text) to authenticated;
grant execute on function public.update_my_profile(jsonb) to authenticated;
revoke all on function public.admin_booking_called(uuid), public.admin_booking_confirm(uuid, numeric), public.admin_booking_token_paid(uuid), public.admin_booking_assign(uuid, uuid),
  public.admin_booking_done(uuid), public.admin_booking_cancel(uuid, text, text), public.admin_update_booking(uuid, jsonb), public.admin_providers_for(uuid) from public, anon;
grant execute on function public.admin_booking_called(uuid), public.admin_booking_confirm(uuid, numeric), public.admin_booking_token_paid(uuid), public.admin_booking_assign(uuid, uuid),
  public.admin_booking_done(uuid), public.admin_booking_cancel(uuid, text, text), public.admin_update_booking(uuid, jsonb), public.admin_providers_for(uuid) to authenticated;

do $$ begin alter publication supabase_realtime add table public.bookings; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.services; exception when others then null; end $$;
