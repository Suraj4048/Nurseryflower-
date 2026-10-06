// ============================================================
// Nurserylelo central config. Baad me real keys/providers yahi se (aur .env se) badlenge.
// ============================================================
const env = import.meta.env as Record<string, string | undefined>;

export type AppName = 'showroom' | 'partner' | 'office';
export const APP: AppName = ((window as unknown as { __APP__?: AppName }).__APP__) ?? 'showroom';

export const config = {
  brand: 'Nurserylelo',
  /** demo = browser me chalta hai; supabase = asli backend */
  mode: (env.VITE_MODE ?? 'demo') as 'demo' | 'supabase',
  supabaseUrl: env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  /** demo | sms | email */
  otpProvider: (env.VITE_OTP_PROVIDER ?? 'demo') as 'demo' | 'sms' | 'email',
  /** mock | edge */
  aiProvider: (env.VITE_AI_PROVIDER ?? 'mock') as 'mock' | 'edge',
  aiEdgeUrl: env.VITE_AI_EDGE_URL ?? '',
  /** demo | upi */
  paymentProvider: (env.VITE_PAYMENT_PROVIDER ?? 'demo') as 'demo' | 'upi',
  upiId: env.VITE_UPI_ID ?? 'yourname@upi',
  supportWhatsApp: env.VITE_SUPPORT_WHATSAPP ?? '919999999999',
  demoAccessCode: env.VITE_DEMO_ACCESS_CODE ?? '',
  /** Customer ki default location (Lucknow) jab tak wo apni location na de */
  defaultLocation: { lat: 26.8467, lng: 80.9462, city: 'Lucknow' },
  /** Order timers (demo me yahi chalte hain; Supabase me settings table + pg_cron) */
  cancelWindowSeconds: 120,
  acceptWindowSeconds: 300,
  demoOtp: '123456',
};

export const isDemo = config.mode === 'demo';
