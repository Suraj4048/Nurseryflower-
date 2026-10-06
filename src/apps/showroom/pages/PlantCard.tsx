import { Link } from 'react-router-dom';
import { Badge, PhotoThumb, toast } from '../../../components/ui';
import { pickName, useLang } from '../../../lib/i18n';
import { rupees } from '../../../lib/format';
import type { PublicPlant } from '../../../lib/types';
import { useCart, useWishlist } from '../stores';

export default function PlantCard({ p }: { p: PublicPlant }) {
  const { t, lang } = useLang();
  const cart = useCart();
  const wish = useWishlist();
  const out = p.stock <= 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Link to={'/plant/' + p.id} className="relative block">
        <PhotoThumb src={p.image} className="h-32 w-full" />
        <button
          onClick={(e) => { e.preventDefault(); wish.toggle(p.id); }}
          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-lg shadow" aria-label="wishlist">
          {wish.has(p.id) ? '❤️' : '🤍'}
        </button>
        {p.ribbon ? <span className="absolute left-0 top-2 rounded-r-full bg-red-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow">{p.ribbon}</span>
          : p.stock > 0 && p.stock <= 5 ? <span className="absolute left-2 top-2"><Badge tone="amber">{p.stock} left</Badge></span> : null}
      </Link>
      <div className="p-3">
        <Link to={'/plant/' + p.id} className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight">{pickName(p.name, lang)}</Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <span className="truncate">{p.brandName}</span>
          {p.tier !== 'new' ? <span title={t('verified')} className="text-leaf-600">✔</span> : null}
        </div>
        <div className="text-[11px] text-slate-400">{t('km_away', { km: p.distanceKm })}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-extrabold text-leaf-800">{rupees(p.price)}</span>
          <button
            disabled={out}
            onClick={() => { cart.add(p.id); toast(t('added')); }}
            className="rounded-xl bg-leaf-600 px-3 py-1.5 text-sm font-bold text-white disabled:bg-slate-300">
            {out ? t('out_of_stock') : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}
