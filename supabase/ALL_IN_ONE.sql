-- ============================================================
-- Nurserylelo: schema. Supabase Dashboard > SQL Editor me paste karke RUN karo (001 -> 002 -> 003 -> 004 ke order me).
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
