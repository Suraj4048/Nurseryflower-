import type { Settings } from './types';

/** Local date YYYY-MM-DD (toISOString UTC me din badal sakta hai, isliye local) */
export const localDate = (ts: number = Date.now()) => {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
/** Booking ka shuru hone ka time. Time na ho to din ke aakhir (lenient) maante hain. */
export const startTs = (date: string, time?: string) => new Date(date + 'T' + (time || '23:59') + ':00').getTime();

/** Customer cancel kare to token ka kitna % wapas: 72h+ / 24-72h / 24h se kam */
export function refundPercent(hoursLeft: number, s: Pick<Settings, 'refund72' | 'refund24' | 'refundLow'>): number {
  if (hoursLeft >= 72) return s.refund72;
  if (hoursLeft >= 24) return s.refund24;
  return s.refundLow;
}
export function refundFor(by: 'customer' | 'owner' | 'provider', tokenPaid: boolean, tokenAmount: number, date: string, time: string, s: Pick<Settings, 'refund72' | 'refund24' | 'refundLow'>, now = Date.now()): number {
  if (!tokenPaid) return 0;
  if (by !== 'customer') return tokenAmount; // hamari ya provider ki taraf se cancel = poora refund
  const hrs = (startTs(date, time) - now) / 3600000;
  return Math.round((tokenAmount * refundPercent(hrs, s)) / 100);
}
export const upiLink = (upiId: string, amount: number, note: string) =>
  'upi://pay?pa=' + encodeURIComponent(upiId) + '&pn=NurseryFlower&am=' + Math.round(amount) + '&cu=INR&tn=' + encodeURIComponent(note);
