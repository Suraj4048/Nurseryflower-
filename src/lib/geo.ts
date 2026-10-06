import type { DeliveryPartner } from './types';

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Sadak ki doori ~ seedhi doori x 1.3 */
export function roadKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return Math.max(0.5, haversineKm(lat1, lng1, lat2, lng2) * 1.3);
}

export function deliveryFee(p: DeliveryPartner, km: number): number {
  return Math.round(Math.max(p.minCharge, p.ratePerKm * km));
}

export function cheapestPartner(partners: DeliveryPartner[], km: number): DeliveryPartner | undefined {
  return partners.filter((p) => p.active).sort((a, b) => deliveryFee(a, km) - deliveryFee(b, km))[0];
}

export function getMyLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location available nahi'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Location nahi mili')),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

/** Lat/lng se shehar/area ka naam (free BigDataCloud, koi key nahi). Na mile to fallback label. */
export async function placeName(lat: number, lng: number, fallback: string): Promise<string> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`, { signal: ctl.signal });
    clearTimeout(t);
    const j = (await r.json()) as { locality?: string; city?: string; principalSubdivision?: string };
    return j.locality || j.city || j.principalSubdivision || fallback;
  } catch { return fallback; }
}
