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
