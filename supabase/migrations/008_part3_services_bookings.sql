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
