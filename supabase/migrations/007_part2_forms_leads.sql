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
