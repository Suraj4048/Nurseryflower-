import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Empty, Spinner, toastErr } from '../../../components/ui';
import { pickName, useLang } from '../../../lib/i18n';
import { listenOnce } from '../../../lib/speech';
import { CATEGORIES, CATEGORY_EMOJI, type Category } from '../../../lib/types';
import PlantCard from './PlantCard';
import { activeFestival, useLoc } from '../stores';

export default function Home() {
  const { t, lang } = useLang();
  const { loc } = useLoc();
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'nearest' | 'cheapest'>('nearest');
  const [listening, setListening] = useState(false);
  const { data, loading } = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  const fest = activeFestival();

  const list = useMemo(() => {
    let l = data ?? [];
    if (cat !== 'all') l = l.filter((p) => p.category === cat);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((p) => (Object.values(p.name).join(' ') + ' ' + p.sku + ' ' + p.brandName).toLowerCase().includes(s));
    l = [...l].sort((a, b) => (sort === 'nearest' ? a.distanceKm - b.distanceKm : a.price - b.price));
    return l;
  }, [data, cat, q, sort]);

  const festPlants = useMemo(() => (fest ? (data ?? []).filter((p) => p.festivalTags.includes(fest.tag)).slice(0, 8) : []), [data, fest]);
  const nurseries = useMemo(() => {
    const m = new Map<string, { name: string; km: number; verified: boolean }>();
    for (const p of data ?? []) {
      const ex = m.get(p.brandName);
      if (!ex || p.distanceKm < ex.km) m.set(p.brandName, { name: p.brandName, km: p.distanceKm, verified: p.tier !== 'new' });
    }
    return [...m.values()].sort((a, b) => a.km - b.km);
  }, [data]);

  async function voice() {
    setListening(true);
    try { const r = await listenOnce(lang); if (r) setQ(r); } catch (e) { toastErr(e); }
    setListening(false);
  }

  return (
    <div className="p-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_placeholder')}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-leaf-500" />
        <button onClick={voice} className={'rounded-xl px-4 text-xl ' + (listening ? 'bg-red-600 text-white' : 'bg-leaf-50')} aria-label={t('voice_search')} title={t('voice_search')}>
          {listening ? '…' : '🎤'}
        </button>
      </div>
      {listening ? <p className="mt-1 text-xs text-red-600">{t('listening')}</p> : null}

      <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
        <button onClick={() => setCat('all')} className={'shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ' + (cat === 'all' ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-slate-200 bg-white')}>{t('cat_all')}</button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={'shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ' + (cat === c ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-slate-200 bg-white')}>
            {CATEGORY_EMOJI[c]} {t('cat_' + c)}
          </button>
        ))}
      </div>

      {fest && festPlants.length > 0 && cat === 'all' && !q ? (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 p-3">
          <div className="mb-2 text-sm font-extrabold text-amber-900">🪔 {fest.name} · {t('festival_banner')}</div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {festPlants.map((p) => (
              <Link key={p.id} to={'/plant/' + p.id} className="w-28 shrink-0 rounded-xl bg-white p-2 text-center text-xs font-semibold shadow-sm">
                <div className="text-3xl">{p.image.startsWith('data:') ? '🌿' : p.image}</div>
                <div className="line-clamp-1">{pickName(p.name, lang)}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {nurseries.length > 0 && cat === 'all' && !q ? (
        <div className="mt-3">
          <div className="mb-1 text-sm font-bold text-slate-700">{t('nearby')}</div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {nurseries.map((n) => (
              <button key={n.name} onClick={() => setQ(n.name)} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs">
                <div className="font-bold">{n.name} {n.verified ? <span className="text-leaf-600">✔</span> : null}</div>
                <div className="text-slate-500">{t('km_away', { km: n.km })}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500">Sort:</span>
        <button onClick={() => setSort('nearest')} className={'rounded-full px-2.5 py-1 font-semibold ' + (sort === 'nearest' ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-100')}>{t('sort_nearest')}</button>
        <button onClick={() => setSort('cheapest')} className={'rounded-full px-2.5 py-1 font-semibold ' + (sort === 'cheapest' ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-100')}>{t('sort_cheapest')}</button>
      </div>

      {loading ? <Spinner text={t('loading')} /> : list.length === 0 ? <Empty text={t('empty')} /> : (
        <div className="mt-3 grid grid-cols-2 gap-3">{list.map((p) => <PlantCard key={p.id} p={p} />)}</div>
      )}
    </div>
  );
}
