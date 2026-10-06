// ============================================================
// INTEGRATION FILE 1/5: OTP
// Demo me OTP hamesha 123456 hai (demo.ts me). Asli mode me ye file Supabase OTP use karti hai.
// Kya badalna hai:
//   VITE_OTP_PROVIDER=email  -> Supabase email OTP (free). Supabase Dashboard > Authentication > Providers > Email.
//   VITE_OTP_PROVIDER=sms    -> Supabase phone OTP. Dashboard > Authentication > Providers > Phone me SMS provider
//                               (Twilio/MessageBird/Vonage etc.) ki keys daalni padti hain. SMS paid hota hai.
// ============================================================
import { config } from '../config';
import { digits } from '../lib/format';

export const otpIdentifierKind = (): 'phone' | 'email' => (config.otpProvider === 'email' ? 'email' : 'phone');

const intl = (phone: string) => '+91' + digits(phone).slice(-10);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sendOtp(client: any, identifier: string): Promise<void> {
  const res = config.otpProvider === 'email'
    ? await client.auth.signInWithOtp({ email: identifier.trim() })
    : await client.auth.signInWithOtp({ phone: intl(identifier) });
  if (res.error) throw new Error(res.error.message);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyOtp(client: any, identifier: string, code: string): Promise<void> {
  const res = config.otpProvider === 'email'
    ? await client.auth.verifyOtp({ email: identifier.trim(), token: code, type: 'email' })
    : await client.auth.verifyOtp({ phone: intl(identifier), token: code, type: 'sms' });
  if (res.error) throw new Error(res.error.message);
}
