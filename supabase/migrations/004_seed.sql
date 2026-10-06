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
