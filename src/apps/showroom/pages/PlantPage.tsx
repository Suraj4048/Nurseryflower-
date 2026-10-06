import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, PhotoThumb, Spinner, toast } from '../../../components/ui';
import { pickName, useLang } from '../../../lib/i18n';
import { rupees } from '../../../lib/format';
import { config } from '../../../config';
import { useCart, useLoc, useWishlist } from '../stores';

export default function PlantPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { loc } = useLoc();
  const nav = useNavigate();
  const cart = useCart();
  const wish = useWishlist();
  const [qty, setQty] = useState(1);
  const { data, loading } = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  if (loading) return <Spinner />;
  const p = data?.find((x) => x.id === id);
  if (!p) return <div className="p-6 text-center text-slate-500">{t('empty')}<div className="mt-3"><Button onClick={() => nav('/')}>{t('home')}</Button></div></div>;
  const wa = 'https://wa.me/?text=' + encodeURIComponent(pickName(p.name, lang) + ' - ' + rupees(p.price) + ' | ' + p.brandName + ' | Nurserylelo ' + location.origin);
  return (
    <div>
      <div className="relative">
        <PhotoThumb src={p.image} className="h-64 w-full" />
        <button onClick={() => nav(-1)} className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 font-bold shadow">←</button>
        <button onClick={() => wish.toggle(p.id)} className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-lg shadow">{wish.has(p.id) ? '❤️' : '🤍'}</button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h1 className="text-2xl font-extrabold">{pickName(p.name, lang)}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{t('sold_by', { name: p.brandName })}</span>
            {p.tier !== 'new' ? <Badge tone="green">✔ {t('verified')}</Badge> : null}
            <span>· {t('km_away', { km: p.distanceKm })}</span>
          </div>
        </div>
        <div className="text-3xl font-extrabold text-leaf-800">{rupees(p.price)}</div>
        {p.care ? (
          <div className="rounded-xl bg-leaf-50 p-3 text-sm">
            <div className="mb-1 font-bold text-leaf-800">🌿 {t('care')}</div>
            {p.care}
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-300">
            <button className="px-4 py-2 text-xl" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <button className="px-4 py-2 text-xl" onClick={() => setQty(Math.min(p.stock, qty + 1))}>+</button>
          </div>
          <Button block disabled={p.stock <= 0} onClick={() => { cart.add(p.id, qty); toast(t('added')); }}>
            {p.stock <= 0 ? t('out_of_stock') : t('add_to_cart')}
          </Button>
        </div>
        <div className="flex gap-2">
          <a href={wa} target="_blank" rel="noreferrer" className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold">💬 {t('share_whatsapp')}</a>
          <a href={'https://wa.me/' + config.supportWhatsApp} target="_blank" rel="noreferrer" className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold">🙋 {t('support')}</a>
        </div>
      </div>
    </div>
  );
}
