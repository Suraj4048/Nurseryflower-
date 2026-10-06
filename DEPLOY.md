# DEPLOY: GitHub -> Cloudflare Pages / Vercel -> Supabase

## A. GitHub par daalna (Codespaces se)
1. github.com par **naya empty repository** banao (naam: `nurserylelo`, Private).
2. Repo page par **Code > Codespaces > Create codespace on main**.
3. Codespace ke left Explorer me **ZIP upload** karo (drag & drop), phir terminal me:
   ```bash
   unzip nurserylelo.zip -d tmp && cp -r tmp/nurserylelo/. . && rm -rf tmp nurserylelo.zip
   npm install
   npm run build        # check: dist/ ban gaya?
   git add -A && git commit -m "Nurserylelo first version" && git push origin main
   ```
   (Agar branch ka naam `master` hai to `git push origin master`.)

## B. Hosting
**Cloudflare Pages (recommended, commercial use free):**
Workers & Pages > Create > Pages > Connect to Git > repo chuno.
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: `.env.example` ke variables (shuru me sirf `VITE_MODE=demo`)
- Deploy. Har `git push` par auto-redeploy.

**Vercel:** Add New > Project > repo import. Framework: Vite (auto). Same env variables. 
Dhyan: Vercel *Hobby* plan non-commercial hai. Asli business ke liye Cloudflare Pages ya Vercel Pro lo.

Deploy ke baad teen URL:
- Showroom `https://xyz.pages.dev/`
- Godown `https://xyz.pages.dev/partner/`
- Office `https://xyz.pages.dev/office/`

## C. PWABuilder
pwabuilder.com me upar ke teen URL ek-ek karke daalo > Package for stores > Android. Har app ka icon/naam alag aayega.

## D. Supabase (jab asli customers lane ho)
1. supabase.com > New project (region: Mumbai). Password save karo.
2. **SQL Editor** > New query > `supabase/ALL_IN_ONE.sql` poora paste > Run. (Error aaye to text bhejo.)
3. **Authentication > Providers > Email**: "Confirm email" **OFF** karo (partner login phone+PIN isi se chalta hai).
4. **Authentication > Users > Add user**: apna admin email + password, "Auto Confirm" ON. Phir SQL Editor me `supabase/make_admin.sql` (apna email daal kar) run karo.
5. Project Settings > API se **Project URL** aur **anon public key** copy karo.
6. Hosting ke Environment Variables me daalo:
   `VITE_MODE=supabase`, `VITE_SUPABASE_URL=...`, `VITE_SUPABASE_ANON_KEY=...`
   (OTP abhi ke liye `VITE_OTP_PROVIDER=email` rakho: free, Supabase email OTP. SMS baad me.)
7. Redeploy. Office me admin login karo > Delivery partners/Rules/Settings dekho > Nurseries/Products add karo.
8. (Optional, recommended) Database > Extensions > `pg_cron` ON, phir `supabase/migrations/005_cron_optional.sql` run karo.
   Na karo to bhi chalega: app khuli ho to har 30 sec me timer check ho jata hai.

**Kabhi service_role key frontend/GitHub me mat daalna.** Sirf anon key (jo public hoti hai); security RLS se hai.

## E. Baad me update kaise
Mujhe sirf wo file bhejo jo INTEGRATIONS.md me likhi hai, main badal ke dunga. Aap Codespace me us file ko replace karke:
`git add -A && git commit -m "update" && git push` -> hosting khud redeploy.
