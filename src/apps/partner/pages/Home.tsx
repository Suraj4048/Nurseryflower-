import { useEffect, useRef, useState } from 'react';
import { api } from '../../../api';
import { useLive, useNow } from '../../../components/hooks';
import { Button, Card, Empty, Spinner, StatusBadge, toast, toastErr } from '../../../components/ui';
import { askNotificationPermission, showLocalNotification } from '../../../integrations/push';
import { mmss, rupees } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import { speak, startAlarm, stopAlarm, unlockAudio } from '../../../lib/speech';
import type { Order } from '../../../lib/types';

function Alert({ order, onAnswer }: { order: Order; onAnswer: (ok: boolean) => void }) {
  const { t, lang } = useLang();
  const now = useNow(250);
  const left = order.acceptBy - now;
  useEffect(() => {
    startAlarm(); speak(t('new_order'), lang);
    showLocalNotification(t('new_order'), order.items.map((i) => i.name).join(', '));
    const again = window.setInterval(() => speak(t('new_order'), lang), 9000);
    return () => { stopAlarm(); clearInterval(again); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);
  const pct = Math.max(0, Math.min(100, (left / (order.acceptBy - order.createdAt)) * 100));
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-amber-500 p-5 text-white">
      <div className="pulse-ring mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl">🔔</div>
      <h1 className="mt-4 text-center text-4xl font-black">{t('new_order')}</h1>
      <p className="text-center text-xl font-bold">{t('accept_within')}</p>
      <div className="mx-auto my-2 text-7xl font-black tabular-nums">{mmss(left)}</div>
      <div className="mx-auto h-3 w-full max-w-sm overflow-hidden rounded-full bg-white/30"><div className="h-full bg-white" style={{ width: pct + '%' }} /></div>
      <div className="mx-auto mt-4 w-full max-w-sm flex-1 overflow-auto rounded-2xl bg-white p-4 text-slate-900">
        {order.items.map((i) => <div key={i.plantId} className="flex justify-between py-1 text-xl font-bold"><span>{i.image.length < 6 ? i.image + ' ' : ''}{i.name} × {i.qty}</span><span>{rupees(i.price * i.qty)}</span></div>)}
        <div className="mt-2 border-t pt-2 text-right text-lg">{t('total')}: <b>{rupees(order.subtotal)}</b></div>
      </div>
      <div className="mx-auto mt-4 grid w-full max-w-sm grid-cols-1 gap-3">
        <button onClick={() => onAnswer(true)} className="rounded-2xl bg-leaf-700 py-6 text-3xl font-black shadow-xl active:scale-95">✅ {t('yes_available')}</button>
        <button onClick={() => onAnswer(false)} className="rounded-2xl bg-red-700 py-5 text-2xl font-black shadow-xl active:scale-95">❌ {t('not_available')}</button>
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useLang();
  const nursery = useLive(() => api.myNursery(), []);
  const orders = useLive(() => api.nurseryOrders(), []);
  const [soundOk, setSoundOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const asked = useRef(false);
  useEffect(() => { if (!asked.current) { asked.current = true; void askNotificationPermission(); } }, []);

  if (nursery.loading || orders.loading) return <Spinner />;
  const n = nursery.data;
  const list = orders.data ?? [];
  const now = Date.now();
  const fresh = list.filter((o) => o.status === 'new' && o.acceptBy > now).sort((a, b) => a.createdAt - b.createdAt)[0];
  const toPack = list.filter((o) => o.status === 'accepted');
  const waiting = list.filter((o) => o.status === 'packed' || o.status === 'out_for_delivery');
  const done = list.filter((o) => ['delivered', 'cancelled', 'rejected', 'expired'].includes(o.status)).slice(0, 8);

  const respond = async (id: string, a: 'accept' | 'reject' | 'packed') => {
    setBusy(true);
    try { await api.respondOrder(id, a); toast(a === 'accept' ? t('accepted_pack') : a === 'reject' ? t('rejected_ok') : t('packed_wait')); await orders.reload(); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  const toggle = async () => { try { await api.setShopOpen(!n?.isOpen); await nursery.reload(); } catch (e) { toastErr(e); } };

  return (
    <div className="space-y-4 p-4" onClick={() => { if (!soundOk) { unlockAudio(); setSoundOk(true); } }}>
      {fresh ? <Alert order={fresh} onAnswer={(ok) => respond(fresh.id, ok ? 'accept' : 'reject')} /> : null}
      <div>
        <div className="text-lg text-slate-500">{t('hello')}</div>
        <div className="text-2xl font-extrabold">{n?.brandName}</div>
        <div className="text-xs text-slate-400">{n?.uniqueId}</div>
      </div>
      <button onClick={toggle} className={'w-full rounded-3xl py-6 text-3xl font-black text-white shadow-lg active:scale-[0.98] ' + (n?.isOpen ? 'bg-leaf-600' : 'bg-slate-500')}>
        {n?.isOpen ? '🟢 ' + t('shop_open') : '🔴 ' + t('shop_closed')}
        <div className="mt-1 text-base font-semibold opacity-90">{n?.isOpen ? t('close_shop') : t('open_shop')}</div>
      </button>
      {!soundOk ? <button onClick={() => { unlockAudio(); setSoundOk(true); }} className="w-full rounded-xl bg-amber-100 py-3 font-bold text-amber-900">🔊 {t('sound_on')}</button> : null}

      {toPack.map((o) => (
        <Card key={o.id} className="space-y-2 border-leaf-300 bg-leaf-50">
          <div className="flex items-center justify-between"><b className="text-xl">📦 {t('pack_now')} #{o.shortId}</b><StatusBadge status={o.status} label={t('status_' + o.status)} /></div>
          {o.items.map((i) => <div key={i.plantId} className="text-lg font-semibold">{i.name} × {i.qty}</div>)}
          {o.deliveryPartnerName ? <div className="text-sm text-slate-600">🚚 {t('pickup_by')}: {o.deliveryPartnerName}</div> : null}
          <p className="text-sm text-slate-600">{t('pack_hint')}</p>
          <Button block size="xl" loading={busy} onClick={() => respond(o.id, 'packed')}>✅ {t('pack_done')}</Button>
        </Card>
      ))}
      {waiting.map((o) => (
        <Card key={o.id}><div className="flex items-center justify-between"><b>#{o.shortId}</b><StatusBadge status={o.status} label={t('status_' + o.status)} /></div>
          <div className="text-sm text-slate-600">{o.items.map((i) => i.name + '×' + i.qty).join(', ')}</div></Card>
      ))}
      {!fresh && toPack.length === 0 && waiting.length === 0 ? <Empty text={t('no_new')} emoji="🔔" /> : null}
      {done.length ? (
        <div><div className="mb-1 font-bold text-slate-500">{t('orders')}</div>
          {done.map((o) => <div key={o.id} className="flex justify-between border-b py-2 text-sm"><span>#{o.shortId} {o.items.map((i) => i.name).join(', ')}</span><StatusBadge status={o.status} label={t('status_' + o.status)} /></div>)}
        </div>
      ) : null}
    </div>
  );
}
