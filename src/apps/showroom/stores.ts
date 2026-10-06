import { useEffect, useState } from 'react';
import { config } from '../../config';
import { getMyLocation, placeName } from '../../lib/geo';

function makeStore<T>(key: string, initial: T) {
  let value: T = (() => { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : initial; } catch { return initial; } })();
  const subs = new Set<() => void>();
  const set = (v: T) => { value = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } subs.forEach((f) => f()); };
  const get = () => value;
  const use = () => {
    const [, force] = useState(0);
    useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
    return value;
  };
  return { get, set, use };
}

export interface CartLine { plantId: string; qty: number }
const cartStore = makeStore<CartLine[]>('nl_cart', []);
export function useCart() {
  const lines = cartStore.use();
  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    add: (plantId: string, qty = 1) => {
      const cur = cartStore.get();
      const ex = cur.find((l) => l.plantId === plantId);
      cartStore.set(ex ? cur.map((l) => (l.plantId === plantId ? { ...l, qty: l.qty + qty } : l)) : [...cur, { plantId, qty }]);
    },
    setQty: (plantId: string, qty: number) => cartStore.set(qty <= 0 ? cartStore.get().filter((l) => l.plantId !== plantId) : cartStore.get().map((l) => (l.plantId === plantId ? { ...l, qty } : l))),
    remove: (plantId: string) => cartStore.set(cartStore.get().filter((l) => l.plantId !== plantId)),
    clear: () => cartStore.set([]),
  };
}

const wishStore = makeStore<string[]>('nl_wish', []);
export function useWishlist() {
  const ids = wishStore.use();
  return { ids, has: (id: string) => ids.includes(id), toggle: (id: string) => wishStore.set(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]) };
}

export interface Loc { lat: number; lng: number; label: string }
const locStore = makeStore<Loc>('nl_loc', { lat: config.defaultLocation.lat, lng: config.defaultLocation.lng, label: config.defaultLocation.city });
export function useLoc() { const v = locStore.use(); return { loc: v, setLoc: (l: Loc) => locStore.set(l) }; }

/** GPS se location lo, naam nikalo, save karo. Sab jagah (header, checkout) yahi chalta hai. */
export async function detectAndSetLocation(fallbackLabel: string): Promise<Loc> {
  const p = await getMyLocation();
  const label = await placeName(p.lat, p.lng, fallbackLabel);
  const l = { lat: p.lat, lng: p.lng, label };
  locStore.set(l);
  return l;
}

// Home page ka filter (slide/button se category ya search set karne ke liye)
export interface HomeFilter { cat: string; q: string }
const filterStore = makeStore<HomeFilter>('nl_homefilter', { cat: 'all', q: '' });
export function useHomeFilter() { const v = filterStore.use(); return { filter: v, setFilter: (f: Partial<HomeFilter>) => filterStore.set({ ...filterStore.get(), ...f }) }; }
export const setHomeFilter = (f: Partial<HomeFilter>) => filterStore.set({ ...filterStore.get(), ...f });

/** Aaj kaun sa tyohaar chal raha hai (demo logic): Diwali Oct-Nov, Holi March */
export function activeFestival(): { tag: string; name: string } | null {
  const m = new Date().getMonth();
  if (m === 9 || m === 10) return { tag: 'diwali', name: 'Diwali' };
  if (m === 2) return { tag: 'holi', name: 'Holi' };
  return null;
}
