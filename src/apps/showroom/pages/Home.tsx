import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Empty, Spinner, toastErr } from '../../../components/ui';
import { pickName, useLang } from '../../../lib/i18n';
import { listenOnce } from '../../../lib/speech';
import { rupees } from '../../../lib/format';
import PlantCard from './PlantCard';
import SlideShow from '../SlideShow';
import { FormButtons } from '../FormSheet';
import { ServiceTiles } from '../BookingSheet';
import { activeFestival, useHomeFilter, useLoc } from '../stores';

export default function Home() {
  const { t, lang } = useLang();
  const { loc } = useLoc();
  const { filter, setFilter } = useHomeFilter();
  const cat = filter.cat;
  const q = filter.q;
  const [sort, setSort] = useState<'nearest' | 'cheapest'>('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [shop, setShop] = useState('');
  const [listening, setListening] = useState(false);
  const { data, loading } = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  const cats = useLive(() => api.listCategories(), []);
  const shows = useLive(() => api.listSlideshows(), []);
  const fest = activeFestival();
  const top = (shows.data ?? []).find((s) => s.placement === 'top');
  const mid = (shows.data ?? []).find((s) => s.placement === 'mid');

  const list = useMemo(() => {
    let l = data ?? [];
    if (cat !== 'all') l = l.filter((p) => (p.categories ?? [p.category]).includes(cat));
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((p) => (Object.values(p.name).join(' ') + ' ' + p.sku + ' ' + p.brandName).toLowerCase().includes(s));
    if (maxPrice && Number(maxPrice) > 0) l = l.filter((p) => p.price <= Number(maxPrice));
    if (shop) l = l.filter((p) => p.brandName === shop);
    return [...l].sort((a, b) => (sort === 'nearest' ? a.distanceKm - b.distanceKm : a.price - b.price));
  }, [data, cat, q, sort, maxPrice, shop]);

  const festPlants = useMemo(() => (fest ? (data ?? []).filter((p) => p.festivalTags.includes(fest.tag)).slice(0, 8) : []), [data, fest]);
  const nurseries = useMemo(() => {
    const m = new Map<string, { name: string; km: number; verified: boolean }>();
    for (const p of data ?? []) {
      const ex = m.get(p.brandName);
      if (!ex || p.distanceKm < ex.km) m.set(p.brandName, { name: p.brandName, km: p.distanceKm, verified: p.tier !== 'new' });
    }
    return [...m.values()].sort((a, b) => a.km - b.km);
  }, [data]);
  const suggestions = useMemo(() => [...(data ?? [])].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4), [data]);

  async function voice() {
    setListening(true);
    try { const r = await listenOnce(lang); if (r) setFilter({ q: r }); } catch (e) { toastErr(e); }
    setListening(false);
  }
  const browsing = cat === 'all' && !q;
  const pill = (on: boolean) => 'shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ' + (on ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-slate-200 bg-white');
  // mid slideshow: product grid ke beech me (aadhe products ke baad, jodi me)
  const split = list.length >= 4 ? Math.ceil(list.length / 2 / 2) * 2 : list.length;
  const grid = (items: typeof list) => <div className="grid grid-cols-2 gap-3">{items.map((p) => <PlantCard key={p.id} p={p} />)}</div>;

  return (
    <div className="p-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setFilter({ q: e.target.value })} placeholder={t('search_placeholder')}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-leaf-500" />
        <button onClick={voice} className={'rounded-xl px-4 text-xl ' + (listening ? 'bg-red-600 text-white' : 'bg-leaf-50')} aria-label={t('voice_search')} title={t('voice_search')}>
          {listening ? '…' : '🎤'}
        </button>
      </div>
      {listening ? <p className="mt-1 text-xs text-red-600">{t('listening')}</p> : null}
      <FormButtons placement="below_search" />

      {top && browsing ? <div className="mt-3"><SlideShow key={top.id + top.slides.length} show={top} /></div> : null}

      {browsing ? <ServiceTiles onFlowers={(cats.data ?? []).some((c) => c.key === 'flowers') ? () => setFilter({ cat: 'flowers' }) : undefined} /> : null}

      <div className="no-scrollbar -mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
        <button onClick={() => setFilter({ cat: 'all' })} className={pill(cat === 'all')}>{t('cat_all')}</button>
        {(cats.data ?? []).map((c) => (
          <button key={c.key} onClick={() => setFilter({ cat: c.key })} className={pill(cat === c.key)}>{c.emoji} {pickName(c.name, lang)}</button>
        ))}
      </div>
      <FormButtons placement="below_categories" />

      {fest && festPlants.length > 0 && browsing ? (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 p-3">
          <div className="mb-2 text-sm font-extrabold text-amber-900">🪔 {fest.name} · {t('festival_banner')}</div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {festPlants.map((p) => (
              <Link key={p.id} to={'/plant/' + p.id} className="w-28 shrink-0 rounded-xl bg-white p-2 text-center text-xs font-semibold shadow-sm">
                <div className="text-3xl">{p.image.startsWith('data:') || p.image.startsWith('http') ? '🌿' : p.image}</div>
                <div className="line-clamp-1">{pickName(p.name, lang)}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {nurseries.length > 0 && browsing ? (
        <div className="mt-3">
          <div className="mb-1 text-sm font-bold text-slate-700">{t('nearby')}</div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {nurseries.map((n) => (
              <button key={n.name} onClick={() => setFilter({ q: n.name })} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs">
                <div className="font-bold">{n.name} {n.verified ? <span className="text-leaf-600">✔</span> : null}</div>
                <div className="text-slate-500">{t('km_away', { km: n.km })}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500">Sort:</span>
        <button onClick={() => setSort('nearest')} className={'rounded-full px-2.5 py-1 font-semibold ' + (sort === 'nearest' ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-100')}>{t('sort_nearest')}</button>
        <button onClick={() => setSort('cheapest')} className={'rounded-full px-2.5 py-1 font-semibold ' + (sort === 'cheapest' ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-100')}>{t('sort_cheapest')}</button>
        <button onClick={() => setShowFilters(!showFilters)} className={'ml-auto rounded-full px-2.5 py-1 font-semibold ' + (showFilters || maxPrice || shop ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-100')}>⚙ {t('filters')}</button>
      </div>
      {showFilters ? (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
          <label className="block"><span className="mb-1 block font-semibold">{t('max_price')}</span>
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} inputMode="numeric" className="w-full rounded-lg border border-slate-300 px-2 py-1.5" placeholder="₹" /></label>
          <label className="block"><span className="mb-1 block font-semibold">{t('nursery')}</span>
            <select value={shop} onChange={(e) => setShop(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5"><option value="">{t('cat_all')}</option>{nurseries.map((n) => <option key={n.name}>{n.name}</option>)}</select></label>
          {(maxPrice || shop) ? <button className="col-span-2 text-left font-semibold text-leaf-700" onClick={() => { setMaxPrice(''); setShop(''); }}>✕ {t('clear_filters')}</button> : null}
        </div>
      ) : null}

      {loading ? <Spinner text={t('loading')} /> : list.length === 0 ? (
        <div>
          <Empty text={t('empty')} />
          {suggestions.length ? (
            <div><div className="mb-2 text-sm font-bold text-slate-700">{t('try_these')}</div>{grid(suggestions)}
              <button onClick={() => { setFilter({ cat: 'all', q: '' }); setMaxPrice(''); setShop(''); }} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold">{t('show_all')}</button></div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3">
          {grid(list.slice(0, split))}
          {mid && browsing && list.length >= 4 ? <div className="my-3"><SlideShow key={mid.id + mid.slides.length} show={mid} /></div> : null}
          <FormButtons placement="mid" />
          {split < list.length ? grid(list.slice(split)) : null}
        </div>
      )}
      <FormButtons placement="bottom" />
      <p className="mt-6 text-center text-[11px] text-slate-400">nurseryflower.com</p>
    </div>
  );
}
