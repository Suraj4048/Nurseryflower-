import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { useLive, useNow } from '../../../components/hooks';
import { Badge, Button, Card, Empty, Spinner, toast, toastErr } from '../../../components/ui';
import { config } from '../../../config';
import { fmtDate, rupees } from '../../../lib/format';
import { BOOKING_PIPELINE, type MyBooking } from '../../../lib/types';
import { refundFor, upiLink } from '../../../lib/booking';
import { useLang } from '../../../lib/i18n';
import { useUser } from '../ctx';

function Pipeline({ status }: { status: MyBooking['status'] }) {
  const { t } = useLang();
  if (status === 'cancelled') return <Badge tone="red">{t('bkst_cancelled')}</Badge>;
  const at = BOOKING_PIPELINE.indexOf(status);
  return (
    <div className="flex flex-wrap gap-1" data-testid="bk-pipeline">
      {BOOKING_PIPELINE.map((s, i) => (
        <span key={s} className={'rounded-full px-2 py-0.5 text-[11px] font-bold ' + (i <= at ? 'bg-leaf-600 text-white' : 'bg-slate-100 text-slate-400')}>{t('bkst_' + s)}</span>
      ))}
    </div>
  );
}

function BookingCard({ b, reload }: { b: MyBooking; reload: () => Promise<void> }) {
  const { t } = useLang();
  const now = useNow(30000);
  const [busy, setBusy] = useState(false);
  const { data: settings } = useLive(() => api.getSettings(), []);
  const open = !['done', 'cancelled'].includes(b.status);
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast(ok); await reload(); } catch (e) { toastErr(e); } setBusy(false); };
  const preview = settings ? refundFor('customer', !!b.tokenPaidAt, b.tokenAmount, b.date, b.time, settings, now) : 0;
  const hoursLeft = Math.max(0, Math.ceil((b.ownerDueAt - now) / 3600000));
  return (
    <Card>
      <div className="flex items-center justify-between"><span className="font-bold" data-testid="bk-card-id">#{b.shortId} · {b.serviceName}</span></div>
      <div className="mt-1 text-sm text-slate-600">📅 {b.date}{b.time ? ' · ' + b.time : ''}</div>
      <div className="text-sm text-slate-600">📍 {b.venue}</div>
      <div className="mt-2"><Pipeline status={b.status} /></div>
      {b.status === 'new' ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">⏳ {t('bk_wait_call', { h: hoursLeft })}</p> : null}
      {b.status === 'called' ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">📞 {t('bk_called_note')}</p> : null}
      {b.status === 'confirmed' ? (
        <div className="mt-2 space-y-2 rounded-xl bg-leaf-50 p-3" data-testid="bk-token-box">
          <div className="text-sm">{t('bk_agreed')}: <b>{rupees(b.agreedAmount)}</b></div>
          <div className="text-base font-extrabold text-leaf-800">{t('bk_token_due', { amt: rupees(b.tokenAmount), pct: b.tokenPercent })}</div>
          <p className="text-xs text-slate-600">{t('bk_token_note')}</p>
          <a href={upiLink(config.upiId, b.tokenAmount, b.shortId)} className="block rounded-xl bg-leaf-600 py-2.5 text-center font-bold text-white" data-testid="bk-upi">💳 {t('bk_pay_upi')}</a>
          {b.tokenClaimedAt ? <p className="text-sm font-semibold text-amber-800" data-testid="bk-claimed">⏳ {t('bk_claimed')}</p>
            : <Button block variant="secondary" loading={busy} onClick={() => act(() => api.claimTokenPaid(b.id), t('bk_claimed'))} data-testid="bk-paid">✅ {t('bk_i_paid')}</Button>}
        </div>
      ) : null}
      {b.status === 'token_paid' || b.status === 'done' ? <p className="mt-2 rounded-lg bg-green-50 p-2 text-sm font-semibold text-green-800">✅ {b.status === 'done' ? t('bk_done_note') : t('bk_booked_note')} · {t('bk_agreed')} {rupees(b.agreedAmount)}</p> : null}
      {b.provider ? (
        <div className="mt-2 rounded-xl border border-slate-200 p-2 text-sm" data-testid="bk-provider">
          <div className="text-xs font-semibold text-slate-500">{t('bk_provider')}</div>
          <div className="font-bold">{b.provider.brand}</div>
          <a className="font-semibold text-leaf-700" href={'tel:' + b.provider.phone}>📞 {b.provider.phone}</a>
        </div>
      ) : null}
      {b.status === 'cancelled' ? <p className="mt-2 text-sm text-red-700">{b.cancelReason}{b.tokenPaidAt ? ' · ' + t('bk_refund') + ': ' + rupees(b.refundAmount ?? 0) : ''}</p> : null}
      {open ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" href={'https://wa.me/' + (b.supportPhone ?? config.supportWhatsApp)} target="_blank" rel="noreferrer">💬 {t('support')}</a>
          <button disabled={busy} className="ml-auto text-sm font-semibold text-red-600" data-testid="bk-cancel"
            onClick={() => { if (confirm(t('bk_cancel_confirm') + (b.tokenPaidAt ? '\n' + t('bk_refund_preview', { amt: rupees(preview) }) : ''))) act(async () => { const r = await api.cancelMyBooking(b.id); if (b.tokenPaidAt) toast(t('bk_refund') + ': ' + rupees(r.refund)); }, t('bk_cancelled_ok')); }}>
            ✕ {t('bk_cancel')}
          </button>
        </div>
      ) : null}
      <div className="mt-1 text-[11px] text-slate-400">{fmtDate(b.createdAt)}</div>
    </Card>
  );
}

export default function Bookings() {
  const { t } = useLang();
  const { user } = useUser();
  const { data, loading, reload } = useLive(() => api.myBookings(), [user?.id], !!user);
  if (!user) return <div className="space-y-3 p-8 text-center"><div className="text-5xl">📅</div><p>{t('bk_login')}</p><Link to="/login" state={{ from: '/bookings' }}><Button>{t('login')}</Button></Link></div>;
  if (loading) return <Spinner />;
  if (!data || data.length === 0) return <Empty text={t('bk_none')} emoji="📅" />;
  return (
    <div className="space-y-2 p-3">
      <h2 className="text-xl font-extrabold">📅 {t('bk_my')}</h2>
      {[...data].sort((a, b) => b.createdAt - a.createdAt).map((b) => <BookingCard key={b.id} b={b} reload={reload} />)}
    </div>
  );
}
