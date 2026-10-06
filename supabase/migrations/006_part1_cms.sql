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
