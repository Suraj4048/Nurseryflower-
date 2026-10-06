-- Pehle Dashboard > Authentication > Users > "Add user" se admin ka email+password banao (Auto confirm ON).
-- Phir apna email niche daal kar ye chalao:
update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL@example.com';
