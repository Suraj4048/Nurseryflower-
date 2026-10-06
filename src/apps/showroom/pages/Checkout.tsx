import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, Empty, Field, Input, Select, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { cheapestPartner, deliveryFee, getMyLocation, roadKm } from '../../../lib/geo';
import { pickName, useLang } from '../../../lib/i18n';
import { rupees } from '../../../lib/format';
import { useUser } from '../ctx';
import { useCart, useLoc } from '../stores';

export default function Checkout() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const { user } = useUser();
  const cart = useCart();
  const { loc, setLoc } = useLoc();
  const plants = useLive(() => api.listPublicPlants(loc), [loc.lat, loc.lng]);
  const dps = useLive(() => api.listDeliveryPartners(), []);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [pay, setPay] = useState<'cod' | 'upi'>('cod');
  const [dp, setDp] = useState('auto');
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => cart.lines.map((l) => ({ l, p: plants.data?.find((x) => x.id === l.plantId) })).filter((r) => r.p) as { l: { plantId: string; qty: number }; p: NonNullable<typeof plants.data>[number] }[], [cart.lines, plants.data]);
  const partners = (dps.data ?? []).filter((d) => d.active);

  const groups = useMemo(() => {
    const m = new Map<string, { brand: string; lat: number; lng: number; subtotal: number }>();
    rows.forEach(({ l, p }) => {
      const g = m.get(p.nurseryId) ?? { brand: p.brandName, lat: p.nurseryLat, lng: p.nurseryLng, subtotal: 0 };
      g.subtotal += p.price * l.qty; m.set(p.nurseryId, g);
    });
    return [...m.values()];
  }, [rows]);

  const fees = groups.map((g) => {
    const km = roadKm(g.lat, g.lng, loc.lat, loc.lng);
    const part = dp === 'auto' ? cheapestPartner(partners, km) : partners.find((x) => x.id === dp);
    return part ? deliveryFee(part, km) : 0;
  });
  const subtotal = groups.reduce((s, g) => s + g.subtotal, 0);
  const feeTotal = fees.reduce((s, f) => s + f, 0);

  if (plants.loading || dps.loading) return <Spinner />;
  if (rows.length === 0) return <Empty text={t('cart_empty')} emoji="🛒" />;
  if (!user) {
    return (
      <div className="space-y-3 p-6 text-center">
        <div className="text-5xl">🔐</div><p className="font-semibold">{t('login_to_order')}</p>
        <Link to="/login" state={{ from: '/checkout' }}><Button size="lg">{t('login')}</Button></Link>
      </div>
    );
  }

  const useLocation = async () => {
    try { const p = await getMyLocation(); setLoc({ ...p, label: t('use_my_location') }); toast(t('location_set')); } catch (e) { toastErr(e); }
  };
  const place = async () => {
    if (address.trim().length < 6) return toast(t('add_address'), 'err');
    setBusy(true);
    try {
      await api.placeOrders({
        lines: cart.lines.filter((l) => rows.some((r) => r.l.plantId === l.plantId)),
        address: address.trim(), pincode: pincode.trim(), lat: loc.lat, lng: loc.lng, paymentMethod: pay, deliveryPartnerId: dp === 'auto' ? undefined : dp,
      });
      cart.clear(); toast(t('order_placed')); nav('/orders', { replace: true });
    } catch (e) { toastErr(e); }
    setBusy(false);
  };

  return (
    <div className="space-y-4 p-3">
      <h2 className="text-xl font-extrabold">{t('checkout')}</h2>
      <Card className="space-y-3">
        <div className="font-bold">📍 {t('delivery_to')}</div>
        <Field label={t('address')}><TextArea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('address_hint')} /></Field>
        <Field label={t('pincode')}><Input value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" maxLength={6} /></Field>
        <Button variant="secondary" size="sm" onClick={useLocation}>📍 {t('use_my_location')}</Button>
      </Card>
      <Card className="space-y-3">
        <Field label={t('delivery_partner')} hint={t('fee_note')}>
          <Select value={dp} onChange={(e) => setDp(e.target.value)}>
            <option value="auto">{t('auto_cheapest')}</option>
            {partners.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(['cod', 'upi'] as const).map((m) => (
            <button key={m} onClick={() => setPay(m)} className={'rounded-xl border px-3 py-3 font-semibold ' + (pay === m ? 'border-leaf-600 bg-leaf-50 text-leaf-800' : 'border-slate-200')}>
              {m === 'cod' ? '💵 ' + t('cod') : '📲 ' + t('upi')}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">{t('paid_note')}</p>
      </Card>
      <Card>
        <div className="mb-2 font-bold">{t('order_summary')}</div>
        {rows.map(({ l, p }) => (
          <div key={l.plantId} className="flex justify-between py-1 text-sm"><span>{pickName(p.name, lang)} × {l.qty} <span className="text-xs text-slate-400">({p.brandName})</span></span><span>{rupees(p.price * l.qty)}</span></div>
        ))}
        {groups.length > 1 ? <p className="mt-2 text-xs text-amber-800">{t('split_note', { n: groups.length })}</p> : null}
        <div className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{t('subtotal')}</span><span>{rupees(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span>{t('delivery_fee')}</span><span>{rupees(feeTotal)}</span></div>
        <div className="mt-1 flex justify-between text-lg font-extrabold"><span>{t('total')}</span><span>{rupees(subtotal + feeTotal)}</span></div>
      </Card>
      <Button block size="lg" loading={busy} onClick={place}>{t('place_order')} · {rupees(subtotal + feeTotal)}</Button>
    </div>
  );
}
