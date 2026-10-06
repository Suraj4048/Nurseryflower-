# NURSERYFLOWER / nurseryflower.com — MASTER FILE
Ye ek hi file hai jisme poora project samjha hua hai: kya bana hai, kahan kaunsi cheez hai, kuch badalna ho to kaunsi file chhuni hai, aur aage kya banna hai. Kisi bhi naye chat me ye file de do, kaam wahin se aage chalega.

Owner: Suraj Yadav (Lucknow). Domain: nurseryflower.com. Brand naam: NurseryFlower (domain nurseryflower.com). Badalna ho to `src/config.ts` aur locale files.

---
## 1. Teen apps, ek codebase
| App | Naam | Kaun use kare | URL | Entry |
|---|---|---|---|---|
| Showroom | customer | `/` | `index.html` |
| Godown | partner (nursery/shop) | `/partner/` | `partner/index.html` |
| Office | admin (owner) | `/office/` | `office/index.html` |

Teeno alag PWA hain (alag manifest aur service worker, PWABuilder ke liye). `window.__APP__` batata hai kaun sa app chal raha hai. Login session key: `nl_session_<app>`.
Stack: React + Vite + TypeScript + Tailwind, HashRouter (URL me `#/`).

## 2. Demo aur Real mode
- `VITE_MODE=demo` (default): sab data browser ke localStorage me (`nl_demo_db_v1`). Koi server nahi chahiye.
- `VITE_MODE=supabase`: asli database. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- UI sirf `Api` interface (`src/api/types.ts`) se baat karta hai. Dono backend (`demo.ts`, `supabase.ts`) wahi interface bharte hain, isliye demo se real me jaane par screens nahi badalti.
- **Demo login:** admin `admin@demo.local / demo123`. Partner `9000000001`, `9000000002`, `9000000003`, PIN `1234`. Naya applicant `9000000010` PIN `1234`. Customer OTP `123456`.

## 3. Folder map (kaunsi file kya karti hai)
```
src/config.ts              env, domain (SITE_DOMAIN), support whatsapp, default location
src/lib/types.ts           SAARE data ke types (Plant, Order, Nursery, Slideshow, CategoryDef...)
src/lib/i18n.ts            bhasha engine (pickName, useLang)
src/lib/booking.ts         booking helpers: refund % (72h/24h), UPI link, local date, start time
src/lib/locales.ts, locales_more.ts, locales_p3.ts   text translations (hi, en). Naya text yahan jodo
src/lib/image.ts           photo compress (compressToMaxKB = 100 KB tak)
src/lib/geo.ts, speech.ts  location, read-aloud
src/api/types.ts           Api interface = backend ka contract
src/api/demo.ts            demo backend (localStorage) + migrate() purane data ke liye
src/api/seed.ts            demo ka shuruaati data (categories, slideshows, plants...)
src/api/supabase.ts        asli backend
src/components/ui.tsx      Button, Card, Modal, Field, Input, toast...
src/components/hooks.ts    useLive (data + auto refresh), useSession
src/components/CategoryPicker.tsx   multi-category chips + RIBBONS list
src/apps/showroom/         customer app (pages/Home, PlantPage, Cart, Checkout, Orders...)
   SlideShow.tsx, actions.ts (slide/button action chalane wala), stores.ts (cart, wishlist, location, home filter)
   FormSheet.tsx (Part 2: Home par form button + form popup, openForm(id))
   BookingSheet.tsx (Part 3: Home par service tiles + booking form popup, openBooking(key)), pages/Bookings.tsx (Meri bookings)
src/apps/partner/          partner app (pages/Join = registration wizard, Home = orders+alarm, Listings = products,
                           Jobs = booking kaam (gardener/decorator ka home), Profile = price/radius/bio/blocked dates)
src/apps/office/           admin app (pages/Catalog = nurseries+products, Cms = categories+slideshows,
                           Admin = Rules+Settings+Audit, Applications, Ops = orders/delivery/complaints,
                           Forms = Form Builder, Leads = Leads inbox, Bookings = booking inbox + Services = service settings)
src/integrations/          OTP, payments, AI, delivery, push (demo ya real, env se chunna)
supabase/migrations/       001 schema, 002 functions, 003 security+storage, 004 seed, 005 cron, 006 part1 CMS, 007 part2 forms+leads, 008 part3 services+bookings
supabase/ALL_IN_ONE.sql    sab migrations ek file me (naya Supabase project ho to yahi chalao)
```

## 4. Ab tak kya bana hai
**Core (kaam kar raha hai, live):** customer showroom, cart, checkout, OTP login, order; partner alarm aur 5 minute accept, auto-reassign; admin approval; naya partner onboarding (documents, photo, rules); earnings; delivery partners; complaints; Hindi/English; PWA.
**Patch 1:** nursery Open/Close toggle (band nursery ke product showroom me nahi dikhte, isi se "approve ke baad product nahi dikha" wali dikkat thi).
**Naam badal gaya:** ab brand NurseryFlower hai (app, manifest, titles, partner login email domain `partners.nurseryflower.com`). Purane localStorage keys (`nl_*`) jaan-boojhkar nahi badle, taaki purana demo data na jaye.
**Part 3 (bana hai):** (1) Naye partner types: decorator, gardener, flower shop, flower vendor — nursery jaisa onboarding (documents Office > Rules se), admin approval. Gardener/decorator ko Products ki jagah Jobs + Profile milta hai. Flower shop/vendor nursery app hi use karte hain (bouquet/mala/flowers products, Zomato-style instant order: 5 min accept, auto-reassign). Nayi categories: Flowers, Bouquet, Mala. (2) Home par "Services & events" ke 4 tiles: Hire a Gardener, Event Decoration, Bulk/Event Order, Flowers & Bouquets (category). Slide/button action `service` se bhi booking khulta hai. (3) Booking form: naam, mobile, date, time (jahan zaruri), venue; pincode/remarks/photo optional (photo 100 KB); date/time ki availability turant dikhti hai (min notice + din ki capacity; token aane par hi slot bharta hai). (4) Request SIRF owner (Office) ko jaati hai, 24 ghante ka timer (Settings me badal sakte ho), late hone par OVERDUE. (5) Office > Bookings: New -> Called -> Confirmed (tay amount, token % apne aap) -> Token paid -> Done; call/WhatsApp/copy, edit (audit), note, cancel (kisne + reason + refund preview). Customer UPI link se token deta hai + "I have paid" dabata hai; owner "Token received" dabata hai tab date pakki. (6) Owner khud kare ya "Provider / Assign" se local provider ko de: list me owner ki priority pehle, phir sabse paas; busy/blocked date, radius se bahar flag. Provider mana kare to kaam wapas owner ke paas. (7) Refund: provider ya hum cancel = poora token; customer cancel = 72h+ 80%, 24-72h 50%, 24h se kam 0% (Settings me badal sakte ho). (8) Office > Services: starting price, token %, commission %, min notice, din ki limit, on/off. (9) Office > Nurseries edit me provider profile (price, radius, priority, blocked dates); Applications me "Edit details" (audit). (10) Supabase: migration 008 (services, bookings, RLS sirf admin, RPC, `partner_jobs` view bina customer data ke), asli Postgres 16 par tested.
**Part 2 (bana hai):** Office > Forms me Form Builder (10 field types: text, number, phone, lamba text, dropdown, radio, checkbox, date, time, photo 100 KB; Hindi/English label; mandatory/optional; order upar-neeche; options Hindi|English), Home par 4 jagah button (search ke neeche, categories ke neeche, beech me, sabse neeche), slideshow ke action "form" se bhi khulta hai. Customer form bharta hai (naam + mobile har form me zaruri) -> Office > Leads inbox: status New/Called/Confirmed/Done/Rejected, call/WhatsApp/copy, note, filter (status, form, search), delete, naya lead aane par badge + toast + beep, audit log. Customer ka number sirf admin ko dikhta hai. Supabase: migration 007 (forms, leads, `submit_lead()` RPC, leads par RLS sirf admin).
**Part 1 (branch `part1`):** dono slideshow (search ke neeche aur home ke beech), Office se poora control, 🔊 read-aloud, product ribbon, multi-category, editable categories, nursery/product edit, location fix, filters, empty-search suggestions, reorder, WhatsApp share.

## 5. Privacy aur business rules (kabhi todna nahi)
1. Customer ya lead ka phone number kisi partner ko kabhi nahi dikhega.
2. Customer ko partner ka number order/booking confirm hone ke baad hi dikhega.
3. Confirm aur token ke baad provider ko sirf date, time, venue dikhega, phone nahi.
4. Customer ko sirf brand naam dikhta hai. Legal naam sirf admin aur owner partner ko.
5. Showroom me wahi product dikhte hain jo `live` ho aur nursery `active` AND `open` ho.
6. Admin partner ka bhara hua sab dekh aur edit kar sakta hai; har badlav audit log me jata hai.
7. Photo hamesha 100 KB ya kam.
8. Purana data nahi tootna chahiye: demo me `migrate()`, Supabase me migrations `if not exists` style me.

## 6. Kuch badalna ho to kaunsi file (cookbook)
| Kaam | Kahan |
|---|---|
| Naya text/translation | `lib/locales_more.ts` (en aur hi dono) |
| Naya data field (jaise Plant me kuch jodna) | `lib/types.ts` -> `api/seed.ts` -> `api/demo.ts` (+`migrate`) -> `api/supabase.ts` mapper -> naya SQL migration |
| Naya backend function | `api/types.ts` me signature -> `demo.ts` -> `supabase.ts` |
| Showroom me naya section | `apps/showroom/pages/Home.tsx` (ya Office se Slideshow/Forms, bina code) |
| Slide ya button ka naya action type | `lib/types.ts` ActionType -> `showroom/actions.ts` -> Office `Cms.tsx` ACTIONS list |
| Ribbon ke naye naam | `components/CategoryPicker.tsx` RIBBONS |
| Partner ke liye kaun se documents zaruri | Office > Rules (code nahi) |
| Categories, slideshows | Office > Categories / Slideshows (code nahi) |
| Settings (accept seconds, payout hold, split) | Office > Settings |
| Naya Office page | page file + `office/App.tsx` me NAV aur Route |
| Naya field type form me | `lib/types.ts` FieldType + FIELD_TYPES, `showroom/FormSheet.tsx` FieldInput, `office/pages/Forms.tsx` TYPE_LABEL, SQL submit_lead (agar naya checks chahiye) |
| Form ke button ki naya jagah | `lib/types.ts` FormPlacement, `showroom/pages/Home.tsx` (<FormButtons placement=...>), `office/pages/Forms.tsx` PLACE_LABEL |
| Service ka price/token/notice/capacity | Office > Services (code nahi) |
| Refund % / 24h confirm timer | Office > Settings (code nahi) |
| Naya partner type | `lib/types.ts` PartnerType + PARTNER_TYPES + emoji, `api/seed.ts` rules, SQL CHECK + rules row, locales `type_<x>` aur `type_<x>_docs` |
| Kaun partner kis service ke liye eligible | `lib/types.ts` SERVICE_PROVIDER_TYPES (+ SQL `admin_booking_assign`, `admin_providers_for`) |
| Rang/theme | `tailwind.config.js` (leaf colors), `index.css` |
| Domain | `src/config.ts` SITE_DOMAIN |

**Hamesha:** badlav ke baad `npm run build` chalao. GitHub par seedha main me mat daalo; pehle branch banao, Vercel preview dekho, phir merge.

## 7. Deploy (kam se kam kaam)
- GitHub repo (Codespaces) -> Vercel auto-deploy. `main` = live site. Har branch ka alag preview link.
- Naya patch ZIP aaye to Codespace me upload karke:
  `cd /workspaces/* && git checkout -b <branch> && unzip -o <patch>.zip && git add -A && git commit -m "<msg>" && git push -u origin <branch>`
- Supabase connect karna ho: DEPLOY.md follow karo; `supabase/ALL_IN_ONE.sql` chalao; Vercel env me `VITE_MODE=supabase` aur URL/key daalo; Auth me "Confirm email" band; admin banane ke liye `supabase/make_admin.sql`.
- Pehle demo me sab verify, phir Supabase.

## 8. Aage ka plan
**Part 2 — Form Builder + Leads (BANA HAI, upar dekho). Purana plan:** Office me Forms page (fields: text, number, phone, dropdown, checkbox, radio, date, time, photo, remarks; Hindi/English label; mandatory/optional; order). Home par "App puchh lo" style button ke roop me chuni hui jagah par. Customer bharta hai -> Leads inbox (Office). Status: New, Called, Confirmed, Done/Rejected. Call/WhatsApp button, notes, filter. Migration 007.
**Part 3 — Naye partner types aur booking (BANA HAI, upar dekho). Purana plan:**
- Types: decorator, gardener provider, flower shop/vendor; nursery jaisa onboarding, rules Office se.
- Phool/bouquet/mala: Zomato-style (5 min accept, auto-reassign).
- Gardener/decoration/bulk: customer form (date, time, venue, remarks, photo) + availability. Request pehle sirf owner ko, 24 ghante ka timer. Owner call karke confirm, khud kare ya local provider ko transfer; provider na mile to owner ke paas rahe.
- Token amount (UPI link + "token mila" button, baad me gateway); percent har service ke liye Settings me. Token aate hi date/time book.
- Refund: provider cancel = poora; customer cancel = samay ke hisaab se aanshik.
- Pipeline: New, Called, Confirmed, Token paid, Done. Privacy rules upar section 5 jaise. Migration 008.
- Extra: minimum event notice, booking commission, packages/starting price, service area (pincode/km), ratings.
**Baad me:** Telegram bot se owner push, translation API, clean URL + SEO, alag no-code Page Designer project.

## 9. Pata hone wali seemaayein
- Automatic calling nahi; sirf `tel:` button.
- Asli push alert aur multi-device realtime ke liye Supabase chahiye.
- Hash URL (`#/`) ki wajah se Google/WhatsApp preview kamzor hai; theek karne ke liye clean URL + server rendering alag project hai.
- Doosri bhashaon ka auto-translation ke liye translate API chahiye; abhi admin hi/en likhta hai.
- Confirm ke baad customer partner ko bypass kar sakta hai (number uske paas hai).

## 10. Test kaise karte hain
Sandbox me npm band hota hai, isliye: esbuild se bundle + Playwright (Chromium) se browser test. Test scripts `docs/tests/`: `full-regression.mjs` (143 checks: showroom, office, partner, onboarding, purana data) aur `part2-forms-leads.mjs` (67 checks: rename, form builder, leads, privacy) aur `part3-services-bookings.mjs` (98 checks: booking flow, privacy, refund, partner jobs, naye partner types). SQL ke liye `docs/tests/part3-booking-sql-test.sql` + `pg-stub.sql`: local Postgres 16 me chalta hai (auth stub ke saath), RLS/privacy/refund asli database me check karta hai. Har patch se pehle sab chalte hain. Asli `vite build` aur styling aapke Codespace/Vercel preview par verify hoti hai.

## 11. Naye chat ke liye ek line
"Ye NurseryFlower project hai, docs/MASTER.md padho. Ab [kaam] karna hai. Pehle poora chalakar test karo, phir patch ZIP aur ek master command do."
