import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../api';
import { useLive, useNow } from '../../../components/hooks';
import { Button, Card, Empty, Modal, PhotoThumb, Spinner, StatusBadge, TextArea, toast, toastErr } from '../../../components/ui';
import { startOnlinePayment } from '../../../integrations/payments';
import { fmtDate, mmss, rupees } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import { config } from '../../../config';
import { useUser } from '../ctx';
import { useCart, useLoc } from '../stores';
import { SITE_DOMAIN } from '../../../config';

export function OrderList() {
  const { t } = useLang();
  const { user } = useUser();
  const { data, loading } = useLive(() => api.myOrders(), [user?.id], !!user);
  if (!user) return <div className="space-y-3 p-8 text-center"><div className="text-5xl">📦</div><p>{t('no_login_orders')}</p><Link to="/login" state={{ from: '/orders' }}><Button>{t('login')}</Button></Link></div>;
  if (loading) return <Spinner />;
  if (!data || data.length === 0) return <Empty text={t('no_orders')} emoji="📦" />;
  return (
    <div className="space-y-2 p-3">
      <h2 className="text-xl font-extrabold">{t('your_orders')}</h2>
      <Link to="/bookings" className="block rounded-xl bg-leaf-50 p-2 text-center text-sm font-bold text-leaf-800">📅 {t('bk_my')}</Link>
      {[...data].sort((a, b) => b.createdAt - a.createdAt).map((o) => (
        <Link key={o.id} to={'/orders/' + o.id} className="block">
          <Card>
            <div className="flex items-center justify-between"><span className="font-bold">#{o.shortId}</span><StatusBadge status={o.status} label={t('status_' + o.status)} /></div>
            <div className="mt-1 text-sm text-slate-600">{o.nurseryBrand} · {o.items.map((i) => i.name + '×' + i.qty).join(', ')}</div>
            <div className="mt-1 flex justify-between text-sm"><span className="text-slate-400">{fmtDate(o.createdAt)}</span><span className="font-extrabold">{rupees(o.total)}</span></div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const nav = useNavigate();
  const { user } = useUser();
  const now = useNow(1000);
  const { data, loading, reload } = useLive(() => api.myOrders(), [user?.id], !!user);
  const [rate, setRate] = useState(5);
  const [review, setReview] = useState('');
  const [claim, setClaim] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const cart = useCart();
  const { loc } = useLoc();
  if (loading) return <Spinner />;
  const o = data?.find((x) => x.id === id);
  if (!o) return <Empty text={t('empty')} />;
  const left = o.cancelUntil - now;
  const canCancel = o.status === 'new' && left > 0;

  const act = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok); await reload(); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  const reorder = async () => {
    const avail = await api.listPublicPlants(loc);
    let n = 0;
    for (const it of o.items) {
      const match = avail.filter((p) => p.sku === it.sku && p.stock >= it.qty).sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (match) { cart.add(match.id, it.qty); n++; }
    }
    if (n) { toast(t('reorder_added', { n })); nav('/cart'); } else toast(t('reorder_none'), 'err');
  };
  const upi = async () => {
    const r = await startOnlinePayment(o.total, o.shortId);
    if (r.link) window.location.href = r.link; else toast('Demo: payment mark ho gaya');
  };

  return (
    <div className="space-y-3 p-3">
      <button onClick={() => nav('/orders')} className="text-sm text-slate-500">← {t('back')}</button>
      <Card>
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{t('order_id')} #{o.shortId}</h2><StatusBadge status={o.status} label={t('status_' + o.status)} /></div>
        <div className="mt-1 text-sm text-slate-600">{t('sold_by', { name: o.nurseryBrand })}</div>
        {o.deliveryPartnerName ? <div className="text-sm text-slate-600">🚚 {o.deliveryPartnerName}</div> : null}
      </Card>
      {o.status === 'new' ? (
        <Card className="text-center">
          {canCancel
            ? <><div className="text-sm text-slate-600">{t('cancel_window', { s: Math.ceil(left / 1000) })} ({mmss(left)})</div><Button variant="danger" className="mt-2" loading={busy} onClick={() => act(() => api.cancelMyOrder(o.id), t('cancelled_ok'))}>{t('cancel_order')}</Button></>
            : <div className="text-sm text-slate-500">{t('cancel_over')}</div>}
        </Card>
      ) : null}
      <Card>
        {o.items.map((i) => (
          <div key={i.plantId} className="flex items-center gap-3 py-1"><PhotoThumb src={i.image} className="h-12 w-12 rounded-lg" /><div className="flex-1 text-sm font-semibold">{i.name} × {i.qty}</div><div className="text-sm">{rupees(i.price * i.qty)}</div></div>
        ))}
        <div className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{t('delivery_fee')}</span><span>{rupees(o.deliveryFee)}</span></div>
        <div className="flex justify-between text-lg font-extrabold"><span>{t('total')}</span><span>{rupees(o.total)}</span></div>
        <div className="mt-1 text-xs text-slate-500">{o.paymentMethod === 'cod' ? t('cod') : t('upi')} · {o.address}</div>
        {o.paymentMethod === 'upi' && !['cancelled', 'rejected', 'expired', 'delivered'].includes(o.status) ? <Button className="mt-2" variant="secondary" onClick={upi}>📲 {t('pay_upi_now')}</Button> : null}
      </Card>
      <Card>
        <div className="mb-2 font-bold">{t('order_timeline')}</div>
        <ol className="space-y-2 border-l-2 border-leaf-200 pl-4">
          {o.events.map((e, i) => (
            <li key={i} className="relative text-sm"><span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-leaf-600" />
              <b>{e.status === 'reassigned' ? t('reassigned') : t('status_' + e.status)}</b> <span className="text-xs text-slate-400">{fmtDate(e.at)}</span>{e.note ? <div className="text-xs text-slate-500">{e.note}</div> : null}</li>
          ))}
        </ol>
      </Card>
      {o.status === 'delivered' ? (
        <Card className="space-y-2">
          {o.rating ? <div>⭐ {o.rating}/5 {o.review}</div> : (
            <>
              <div className="font-bold">{t('rate_order')}</div>
              <div className="flex gap-1 text-3xl">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRate(n)}>{n <= rate ? '⭐' : '☆'}</button>)}</div>
              <TextArea rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder={t('write_review')} />
              <Button loading={busy} onClick={() => act(() => api.reviewOrder(o.id, rate, review), t('review_sent'))}>{t('rate_submit')}</Button>
            </>
          )}
          <Button variant="secondary" onClick={() => setClaim(true)}>🌱 {t('claim_replacement')}</Button>
        </Card>
      ) : null}
      <div className="flex gap-2">
        <Button className="flex-1" variant="secondary" onClick={reorder}>🔁 {t('reorder')}</Button>
        <a className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-sm font-semibold" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Order #' + o.shortId + ' - ' + o.items.map((i) => i.name + ' x' + i.qty).join(', ') + ' | ' + rupees(o.total) + ' | ' + SITE_DOMAIN)}`}>💬 {t('share_whatsapp')}</a>
      </div>
      <a className="block text-center text-sm font-semibold text-leaf-700" href={`https://wa.me/${config.supportWhatsApp}?text=${encodeURIComponent('Order #' + o.shortId)}`} target="_blank" rel="noreferrer">💬 {t('support')}</a>
      <Modal open={claim} onClose={() => setClaim(false)} title={t('claim_replacement')}>
        <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('complaint_reason')} />
        <Button block className="mt-3" loading={busy} onClick={() => act(async () => { await api.raiseComplaint(o.id, reason || 'Plant issue'); setClaim(false); }, t('claim_sent'))}>{t('send')}</Button>
      </Modal>
    </div>
  );
}
