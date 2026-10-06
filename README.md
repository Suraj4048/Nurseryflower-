# Nurserylelo: poora codebase (Showroom + Godown + Office)

Ek hi project, teen installable PWA:

| App | Kaun use karega | URL (deploy ke baad) |
|---|---|---|
| **Showroom** | Customer | `https://aapka-domain.com/` |
| **Godown** | Partner (nursery / dukaan) | `https://aapka-domain.com/partner/` |
| **Office** | Admin (aap) | `https://aapka-domain.com/office/` |

Teeno URL PWABuilder (pwabuilder.com) me alag-alag paste karke Android/Windows package bana sakte ho. Har app ka apna manifest, service worker aur icons hain.

## 1. Abhi kya chalta hai (DEMO MODE, default)
`VITE_MODE=demo` me poora app **bina server, bina OTP, bina API key** ke chalta hai. Data us browser ke localStorage me rehta hai
(Showroom, Godown, Office teeno tab ek hi browser me khol kar order ka poora flow dekh sakte ho).

Demo logins:
- Customer: koi bhi 10-digit number, OTP **123456**
- Partner (Godown): `9000000001` / PIN `1234` (Green Heaven nursery), `9000000002`, `9000000003` (khaad ki dukaan)
- Naya partner jiska application admin ke paas pending hai: `9000000010` / `1234`
- Admin (Office): `admin@demo.local` / `demo123`

Demo flow: Showroom me order do -> Godown me full-screen alarm (5:00 timer) -> YES -> Pack -> Office me order aage badhao.
5 min me jawab na aaye ya NO dabe to order auto dusri nursery (same paudha) ko chala jata hai.

## 2. Chalane ka tarika
```bash
npm install
npm run dev        # http://localhost:5173  (/partner/ aur /office/ bhi)
npm run build      # dist/ folder (teeno app)
```
GitHub + Codespaces + hosting ke poore steps: **DEPLOY.md**. Real OTP/API ke liye kaun si file badalni hai: **INTEGRATIONS.md**.

## 3. Folder map
```
index.html, partner/index.html, office/index.html   teen entry (teen PWA)
public/                                             manifest, service worker, icons
src/config.ts                                       sab settings ek jagah (env se)
src/api/types.ts                                    Api interface (UI sirf isse baat karta hai)
src/api/demo.ts                                     DEMO backend (browser)
src/api/supabase.ts                                 REAL backend (Supabase)
src/integrations/{otp,ai,delivery,payments,push}.ts 5 file jahan baad me keys/API lagegi
src/apps/{showroom,partner,office}/                 teeno app ke screens
src/lib/                                            i18n (17 bhasha), geo, format, speech, image
supabase/migrations/*.sql                           database, security (RLS), order logic
supabase/ALL_IN_ONE.sql                             001-004 ek file me (SQL Editor me paste karo)
```

## 4. Kya poora hai, kya nahi (sach)
**Poora (demo me chalta hai):** customer browse/search/voice search/cart/checkout/order tracking/cancel timer/rating/replacement claim,
cheapest delivery partner auto-select, order nursery ke hisaab se split, brand-name-only display, 5-min accept timer + auto-reassign,
partner join wizard (4 type, koi ek ID, photos, licence/GST jaha zaruri), admin verification checklist + approve, partner products (admin approval ke baad live),
earnings (80/15/5), admin: dashboard, nurseries, products, orders, delivery partners, complaints, rules, settings, audit. 17 bhasha (Hindi + English poori, baaki 15 me core text; baki English me dikhta hai, native speaker se check karao).

**Stub (baad me real karna hai):** OTP (demo 123456), AI plant identify (mock jawab), delivery company booking (manual link), online payment gateway (COD + UPI link),
background push alarm (abhi sirf app khula ho tab; reliable ke liye Capacitor + FCM chahiye).

**Test status:** demo logic aur UI maine likhe hain, lekin is build-environment me npm registry block tha, isliye `npm run build` aur browser me click-test **maine nahi chalaya**.
Pehli baar `npm install && npm run build` karte waqt koi chhoti type/build galti aa sakti hai: error ka text mujhe bhej dena, main turant fix kar dunga.
Supabase SQL aur adapter bhi live Supabase par abhi test nahi hue.
