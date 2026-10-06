import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Empty, PhotoThumb, Spinner } from '../../../components/ui';
import { pickName, useLang } from '../../../lib/i18n';
import { rupees } from '../../../lib/format';
import { useCart, useLoc } from '../stores';

export default function CartPage() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const cart = useCart();
  const { loc } = useLoc();
  const { data, loading } = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  if (loading) return <Spinner />;
  const rows = cart.lines.map((l) => ({ l, p: data?.find((x) => x.id === l.plantId) })).filter((r) => r.p);
  const subtotal = rows.reduce((s, r) => s + r.p!.price * r.l.qty, 0);
  const nurseries = new Set(rows.map((r) => r.p!.brandName)).size;
  if (rows.length === 0) return <Empty text={t('cart_empty')} emoji="🛒" />;
  return (
    <div className="p-3">
      <h2 className="mb-3 text-xl font-extrabold">🛒 {t('cart')}</h2>
      <div className="space-y-2">
        {rows.map(({ l, p }) => (
          <div key={l.plantId} className="flex gap-3 rounded-2xl border border-slate-200 p-2">
            <PhotoThumb src={p!.image} className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{pickName(p!.name, lang)}</div>
              <div className="text-xs text-slate-500">{p!.brandName}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-extrabold text-leaf-800">{rupees(p!.price * l.qty)}</span>
                <div className="flex items-center rounded-lg border border-slate-300">
                  <button className="px-3 py-1" onClick={() => cart.setQty(l.plantId, l.qty - 1)}>−</button>
                  <span className="w-6 text-center text-sm font-bold">{l.qty}</span>
                  <button className="px-3 py-1" onClick={() => cart.setQty(l.plantId, Math.min(p!.stock, l.qty + 1))}>+</button>
                </div>
              </div>
            </div>
            <button onClick={() => cart.remove(l.plantId)} className="self-start px-1 text-slate-400" aria-label={t('remove')}>✕</button>
          </div>
        ))}
      </div>
      {nurseries > 1 ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Aapka order {nurseries} nurseries me baant diya jayega (alag delivery).</p> : null}
      <div className="mt-4 flex items-center justify-between text-lg font-extrabold"><span>{t('subtotal')}</span><span>{rupees(subtotal)}</span></div>
      <Button block size="lg" className="mt-3" onClick={() => nav('/checkout')}>{t('checkout')}</Button>
    </div>
  );
}
