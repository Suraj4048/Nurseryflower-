# INTEGRATIONS: kaun si file kab badalni hai

| Zarurat | File | Aap kya doge |
|---|---|---|
| Keys, mode, UPI id, WhatsApp | hosting ke Environment Variables (ya `.env`) | variable ki value |
| Real OTP (email free) | `src/integrations/otp.ts` + Supabase dashboard | `VITE_OTP_PROVIDER=email`. Code badalna nahi padega |
| Real OTP (SMS) | Supabase > Auth > Phone provider (Twilio/MessageBird...) | SMS provider ki keys sirf Supabase dashboard me. `VITE_OTP_PROVIDER=sms` |
| AI plant identify | `src/integrations/ai.ts` + ek Supabase Edge Function | Gemini key Edge Function ke secret me; `VITE_AI_PROVIDER=edge`, `VITE_AI_EDGE_URL` |
| Delivery booking API (Porter/Shadowfax...) | `src/integrations/delivery.ts` | company ka API doc + sandbox key (key server par rahegi) |
| Online payment (Razorpay/Cashfree) | `src/integrations/payments.ts` + Edge Function | gateway ka naam + test keys |
| Reliable alarm (app band ho tab bhi) | `src/integrations/push.ts` + Capacitor/FCM | Firebase project (alag step) |
| Commission %, timers | Office > Settings | code nahi badalna |
| Partner ke documents ke rules | Office > Rules | code nahi badalna |
| Naye shehar ka code (NURS-XYZ-001) | `supabase/migrations/002_functions.sql` (`nursery_before_insert`) | shehar ka naam |

Mujhe file bhejte waqt: file ka naam + jo chahiye (kaun sa provider) bata dena. Secret keys chat me bhejne ki zaroorat nahi: sirf provider ka naam batao, keys aap khud hosting/Supabase dashboard me daaloge.
