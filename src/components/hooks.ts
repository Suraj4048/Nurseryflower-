import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { User } from '../lib/types';

/** Data load karta hai aur backend me badlav (doosre tab/realtime) hone par apne aap dobara laata hai. */
export function useLive<T>(fn: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const load = useCallback(async () => {
    try { setData(await fnRef.current()); setError(''); } catch (e) { setError((e as Error).message); }
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    void load();
    let timer: number | undefined;
    const unsub = api.subscribe(() => { window.clearTimeout(timer); timer = window.setTimeout(() => void load(), 150); });
    return () => { unsub(); window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);
  return { data, error, loading, reload: load };
}

export function useSession() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const refresh = useCallback(async () => { try { setUser(await api.currentUser()); } catch { setUser(null); } }, []);
  useEffect(() => {
    void refresh();
    return api.subscribe(() => void refresh());
  }, [refresh]);
  return { user, refresh, loading: user === undefined };
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
