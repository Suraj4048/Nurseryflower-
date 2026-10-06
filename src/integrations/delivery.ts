// ============================================================
// INTEGRATION FILE 3/5: Delivery booking
// Abhi: "Book" button delivery partner ki website/app khol deta hai (manual booking) ya demo tracking ID banata hai.
// Baad me: Porter/Shadowfax/Borzo ki business API milne par yaha bookDelivery() me API call likhni hai
// (API key sirf server/Edge Function me; browser se seedha mat bhejo).
// ============================================================
import type { DeliveryPartner, Order } from '../lib/types';

export interface Booking { ok: boolean; trackingId: string; url?: string; demo: boolean }

export function manualBookingUrl(partner: DeliveryPartner | undefined): string | undefined {
  return partner?.deepLink;
}

export async function bookDelivery(order: Order, partner: DeliveryPartner | undefined): Promise<Booking> {
  // TODO(real): yaha delivery partner ki API call karo (server side).
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true, trackingId: 'DEMO-' + order.shortId, url: manualBookingUrl(partner), demo: true };
}
