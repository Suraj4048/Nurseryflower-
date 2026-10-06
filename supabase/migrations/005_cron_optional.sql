-- OPTIONAL: 5 min accept timeout ko server par chalane ke liye (recommended).
-- Pehle Supabase Dashboard > Database > Extensions me "pg_cron" ON karo, phir ye chalao.
-- Agar skip karo to bhi chalega: app khuli hone par har 30 sec me tick_orders() khud bulata hai.
select cron.schedule('nl-tick-orders', '* * * * *', $$ select public.tick_orders(); $$);
