import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useLive } from '../../components/hooks';
import { Button, Input, Modal, TextArea, toastErr } from '../../components/ui';
import { isPhone, rupees } from '../../lib/format';
import { localDate } from '../../lib/booking';
import { pickName, useLang } from '../../lib/i18n';
import { compressToMaxKB } from '../../lib/image';
import type { Availability, ServiceDef } from '../../lib/types';
import { SessionCtx } from './ctx';
import { useLoc } from './stores';

// Kaun si service ka booking form khula hai (home tile / slide / button se)
let openKey: string | null = null;
const subs = new Set<() => void>();
export function openBooking(key: string) { openKey = key; subs.forEach((f) => f()); }
function closeBooking() { openKey = null; subs.forEach((f) => f()); }
function useOpenKey() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return openKey;
}

/** Home par services ke tiles */
export function ServiceTiles({ onFlowers }: { onFlowers?: () => void }) {
  const { t, lang } = useLang();
  const { data } = useLive(() => api.listServices(), []);
  const list = data ?? [];
  if (list.length === 0) return null;
  return (
    <div className="mt-3" data-testid="service-tiles">
      <div className="mb-1 text-sm font-bold text-slate-700">{t('svc_title')}</div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((s) => (
          <button key={s.key} onClick={() => openBooking(s.key)} data-testid={'svc-' + s.key}
            className="rounded-2xl border border-leaf-100 bg-leaf-50 p-3 text-left active:scale-[0.98]">
            <span className="text-3xl">{s.emoji}</span>
            <span className="mt-1 block text-sm font-extrabold text-leaf-800">{pickName(s.name, lang)}</span>
            <span className="block text-[11px] leading-tight text-slate-500">{pickName(s.sub, lang)}</span>
            <span className="mt-1 block text-[11px] font-bold text-amber-700">{t('bk_starting', { p: rupees(s.startingPrice) })}</span>
          </button>
        ))}
        {onFlowers ? (
          <button onClick={onFlowers} data-testid="svc-flowers" className="rounded-2xl border border-pink-100 bg-pink-50 p-3 text-left active:scale-[0.98]">
            <span className="text-3xl">💐</span>
            <span className="mt-1 block text-sm font-extrabold text-pink-800">{t('svc_flowers')}</span>
            <span className="block text-[11px] leading-tight text-slate-500">{t('svc_flowers_sub')}</span>
            <span className="mt-1 block text-[11px] font-bold text-amber-700">⚡ {t('svc_instant')}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function BookingForm({ svc, onClose }: { svc: ServiceDef; onClose: () => void }) {
  const { t, lang } = useLang();
  const sess = useContext(SessionCtx);
  const { loc } = useLoc();
  const [name, setName] = useState(sess.user?.name && sess.user.name !== 'Customer' ? sess.user.name : '');
  const [phone, setPhone] = useState(sess.user?.phone ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [pincode, setPincode] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photo, setPhoto] = useState('');
  const [av, setAv] = useState<Availability | null>(null);
  const [minDate, setMinDate] = useState(localDate());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.checkAvailability(svc.key, localDate(Date.now() + svc.minNoticeHours * 3600000)).then((a) => setMinDate(a.minDate)).catch(() => {}); }, [svc.key, svc.minNoticeHours]);
  useEffect(() => {
    if (!date) { setAv(null); return; }
    let live = true;
    api.checkAvailability(svc.key, date, time || undefined).then((a) => { if (live) setAv(a); }).catch(() => {});
    return () => { live = false; };
  }, [svc.key, date, time]);

  const send = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr(t('f_err_name'));
    if (!isPhone(phone)) return setErr(t('f_err_phone'));
    if (!date) return setErr(t('bk_err_date'));
    if (svc.needsTime && !time) return setErr(t('bk_err_time'));
    if (venue.trim().length < 6) return setErr(t('bk_err_venue'));
    if (av && !av.ok) return setErr(avText());
    setBusy(true);
    try {
      const r = await api.submitBooking({ serviceKey: svc.key, name, phone, date, time, venue, pincode, remarks, photo: photo || undefined, lat: loc.lat, lng: loc.lng });
      setSent(r.shortId);
    } catch (e) { toastErr(e); setErr((e as Error).message); }
    setBusy(false);
  };
  const avText = () => !av ? '' : av.ok ? t('bk_avail_ok', { n: av.left }) : av.reason === 'full' ? t('bk_full') : av.reason === 'past' ? t('bk_past') : t('bk_notice', { h: svc.minNoticeHours, d: av.minDate });

  if (sent) {
    return (
      <div className="space-y-3 py-3 text-center" data-testid="booking-sent">
        <div className="text-5xl">✅</div>
        <p className="text-lg font-bold">{t('bk_sent')}</p>
        <p className="text-sm text-slate-600">{t('bk_sent_note')}</p>
        <p className="rounded-xl bg-leaf-50 p-2 text-sm font-bold" data-testid="booking-id">#{sent}</p>
        <Link to="/bookings" onClick={onClose}><Button block>{t('bk_view')}</Button></Link>
        <Button block variant="secondary" onClick={onClose}>{t('f_close')}</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">{pickName(svc.sub, lang)} · <b>{t('bk_starting', { p: rupees(svc.startingPrice) })}</b></p>
      <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">ℹ️ {t('bk_how', { pct: svc.tokenPercent, h: svc.minNoticeHours })}</p>
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('f_name')} *</span><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" data-testid="bk-name" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('f_phone')} *</span><Input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value)} autoComplete="tel" data-testid="bk-phone" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t('bk_date')} *</span><Input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} data-testid="bk-date" /></label>
        {svc.needsTime ? <label className="block"><span className="mb-1 block text-sm font-semibold">{t('bk_time')} *</span><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="bk-time" /></label> : <div />}
      </div>
      {av ? <p data-testid="bk-avail" className={'rounded-lg p-2 text-sm font-semibold ' + (av.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{av.ok ? '✅ ' : '⛔ '}{avText()}</p> : null}
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('bk_venue')} *</span><TextArea rows={2} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder={t('address_hint')} data-testid="bk-venue" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('bk_pincode')}</span><Input value={pincode} inputMode="numeric" maxLength={6} onChange={(e) => setPincode(e.target.value)} data-testid="bk-pin" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('bk_remarks')}</span><TextArea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} data-testid="bk-remarks" /></label>
      <div className="flex items-center gap-3">
        {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" /> : null}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="bk-photo"
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setPhoto(await compressToMaxKB(f, 100, 900)); } catch (er) { toastErr(er); } } }} />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>📷 {t('f_photo')}</Button>
        {photo ? <button type="button" className="text-sm text-red-600" onClick={() => setPhoto('')}>✕</button> : null}
      </div>
      {err ? <p className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700" data-testid="bk-err">{err}</p> : null}
      <p className="text-xs text-slate-500">{t('bk_privacy')}</p>
      <Button block size="lg" loading={busy} onClick={send} data-testid="bk-send">{t('bk_send')}</Button>
    </div>
  );
}

export function BookingHost() {
  const key = useOpenKey();
  const { lang } = useLang();
  const { data } = useLive(() => api.listServices(), []);
  const svc = key ? (data ?? []).find((s) => s.key === key) : undefined;
  return (
    <Modal open={!!svc} onClose={closeBooking} title={svc ? svc.emoji + ' ' + pickName(svc.name, lang) : ''}>
      {svc ? <BookingForm key={svc.key} svc={svc} onClose={closeBooking} /> : null}
    </Modal>
  );
}
