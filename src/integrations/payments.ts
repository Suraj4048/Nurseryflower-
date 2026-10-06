// ============================================================
// INTEGRATION FILE 4/5: Payments
// Abhi: COD, aur UPI ka "intent link" (mobile par UPI app khulta hai). Paise seedha aapke UPI id me aate hain; matching manual.
// Baad me: Razorpay/Cashfree jaisa gateway lagana ho to yaha startOnlinePayment() likho (server par order create + webhook verify).
// .env: VITE_PAYMENT_PROVIDER=upi aur VITE_UPI_ID=yourname@upi
// ============================================================
import { config } from '../config';

export function upiIntentLink(amount: number, orderId: string): string {
  const q = new URLSearchParams({ pa: config.upiId, pn: config.brand, am: String(amount), cu: 'INR', tn: 'Order ' + orderId });
  return 'upi://pay?' + q.toString();
}

export async function startOnlinePayment(_amount: number, _orderId: string): Promise<{ status: 'demo_paid' | 'pending'; link?: string }> {
  if (config.paymentProvider === 'upi') return { status: 'pending', link: upiIntentLink(_amount, _orderId) };
  return { status: 'demo_paid' };
}
