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
