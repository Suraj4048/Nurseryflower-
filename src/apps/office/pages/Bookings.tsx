import { useState } from 'react';
import { api } from '../../../api';
import { useLive, useNow } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { rupees } from '../../../lib/format';
import { refundFor } from '../../../lib/booking';
import { BOOKING_PIPELINE, type Booking, type BookingStatus, type ProviderOption, type ServiceDef } from '../../../lib/types';

const LABEL: Record<BookingStatus, string> = { new: 'New', called: 'Called', confirmed: 'Confirmed', token_paid: 'Token paid (Booked)', done: 'Done', cancelled: 'Cancelled' };
const tone = (s: BookingStatus) => (s === 'new' ? 'amber' : s === 'done' || s === 'token_paid' ? 'green' : s === 'cancelled' ? 'red' : 'blue') as 'amber' | 'green' | 'red' | 'blue';
const when = (t: number) => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function Left({ due, status }: { due: number; status: BookingStatus }) {
  const now = useNow(30000);
  if (!['new', 'called'].includes(status)) return null;
  const ms = due - now;
  const h = Math.floor(Math.abs(ms) / 3600000); const m = Math.floor((Math.abs(ms) % 3600000) / 60000);
  return ms < 0
    ? <span data-testid="bk-overdue" className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">OVERDUE {h}h {m}m</span>
    : <span data-testid="bk-timer" className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">⏱ {h}h {m}m baaki</span>;
}

function Assign({ b, onClose }: { b: Booking; onClose: () => void }) {
  const { data, loading } = useLive(() => api.adminProvidersFor(b.id), [b.id]);
  const go = async (id: string | null) => { try { await api.adminBookingAssign(b.id, id); toast(id ? 'Provider ko de diya' : 'Owner ke paas rakha'); onClose(); } catch (e) { toastErr(e); } };
  if (loading) return <Spinner />;
  const list: ProviderOption[] = data ?? [];
  return (
    <div className="space-y-2" data-testid="assign-list">
      <p className="text-xs text-slate-500">Priority (bada number) pehle, phir sabse paas. Customer ka naam/number provider ko NAHI dikhta.</p>
      {list.length === 0 ? <p className="rounded-lg bg-amber-50 p-2 text-sm">Is service ke liye koi partner nahi mila. Kaam owner ke paas rahega.</p> : null}
      {list.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-xl border p-2" data-testid="assign-row">
          <div className="flex-1 text-sm"><div className="font-bold">{p.brand} <span className="text-xs font-normal text-slate-500">{p.partnerType}</span></div>
            <div className="text-xs text-slate-500">📍 {p.distanceKm} km{p.radiusKm ? ' (area ' + p.radiusKm + ' km)' : ''}{p.radiusKm && p.distanceKm > p.radiusKm ? ' ⚠ area se bahar' : ''} · priority {p.priority}{p.startingPrice ? ' · from ' + rupees(p.startingPrice) : ''}</div>
            <div className="flex gap-1">{!p.isOpen ? <Badge tone="gray">Not available</Badge> : null}{p.busy ? <Badge tone="red">Busy us din</Badge> : null}</div></div>
          <Button size="sm" onClick={() => go(p.id)} data-testid="assign-btn">Assign</Button>
        </div>
      ))}
      <Button block variant="secondary" onClick={() => go(null)} data-testid="assign-owner">Owner khud karega (provider nahi)</Button>
    </div>
  );
}

function Card1({ b, onChanged }: { b: Booking; onChanged: () => void }) {
  const [amount, setAmount] = useState(String(b.agreedAmount || ''));
  const [note, setNote] = useState(b.note);
  const [assign, setAssign] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [by, setBy] = useState<'customer' | 'owner' | 'provider'>('customer');
  const [reason, setReason] = useState('');
  const [edit, setEdit] = useState(false);
  const [ef, setEf] = useState({ customerName: b.customerName, customerPhone: b.customerPhone, date: b.date, time: b.time, venue: b.venue, pincode: b.pincode, remarks: b.remarks });
  const [copied, setCopied] = useState(false);
  const { data: settings } = useLive(() => api.getSettings(), []);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); onChanged(); } catch (e) { toastErr(e); } };
  const closed = ['done', 'cancelled'].includes(b.status);
  const copy = async () => { try { await navigator.clipboard.writeText(b.customerPhone); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast(b.customerPhone); } };
  const preview = settings ? refundFor(by, !!b.tokenPaidAt, b.tokenAmount, b.date, b.time, settings) : 0;
  const tokenCalc = Math.round((Number(amount) || 0) * b.tokenPercent / 100);
  return (
    <Card className="space-y-2">
      <div data-testid="bk-row" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold">#{b.shortId}</span><span className="font-bold">{b.serviceName}</span>
          <Badge tone={tone(b.status)}>{LABEL[b.status]}</Badge><Left due={b.ownerDueAt} status={b.status} />
          <span className="ml-auto text-xs text-slate-500">{when(b.createdAt)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold">{b.customerName}</span><span className="font-mono font-bold">{b.customerPhone}</span>
          <a className="rounded-lg bg-leaf-600 px-3 py-1 text-xs font-bold text-white" href={'tel:' + b.customerPhone}>📞 Call</a>
          <a className="rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-800" href={'https://wa.me/91' + b.customerPhone} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <button className="rounded-lg border px-3 py-1 text-xs font-bold" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 text-sm">
          <div>📅 <b>{b.date}</b> {b.time ? '· ' + b.time : ''}</div><div>📍 {b.venue} {b.pincode}</div>
          {b.remarks ? <div>📝 {b.remarks}</div> : null}
          {b.photo ? <img src={b.photo} alt="" className="mt-1 h-24 rounded-lg object-cover" /> : null}
        </div>
        <div className="text-xs text-slate-600">
          Handler: <b>{b.handler === 'owner' ? 'Owner (aap)' : (b.providerBrand ?? '-') + ' (' + (b.providerState ?? '') + ')'}</b>
          {b.agreedAmount ? <> · Amount <b>{rupees(b.agreedAmount)}</b> · Token <b>{rupees(b.tokenAmount)}</b> ({b.tokenPercent}%){b.tokenClaimedAt && !b.tokenPaidAt ? <span className="ml-1 rounded bg-amber-100 px-1 font-bold text-amber-900" data-testid="claimed-flag">Customer ne kaha: token de diya</span> : null}</> : null}
          {b.status === 'cancelled' ? <> · Cancel by <b>{b.cancelledBy}</b>: {b.cancelReason} · refund <b>{rupees(b.refundAmount ?? 0)}</b></> : null}
        </div>
        {!closed ? (
          <div className="flex flex-wrap items-end gap-2">
            {b.status === 'new' ? <Button size="sm" variant="secondary" onClick={() => run(() => api.adminBookingCalled(b.id), 'Called mark hua')} data-testid="bk-called">📞 Called</Button> : null}
            {['new', 'called'].includes(b.status) ? (
              <>
                <div className="w-32"><Field label="Tay amount ₹"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="bk-amount" /></Field></div>
                <span className="pb-2 text-xs text-slate-500">Token {rupees(tokenCalc)}</span>
                <Button size="sm" onClick={() => run(() => api.adminBookingConfirm(b.id, Number(amount)), 'Confirm ho gaya')} data-testid="bk-confirm">✅ Confirm</Button>
              </>
            ) : null}
            {b.status === 'confirmed' ? <Button size="sm" onClick={() => run(() => api.adminBookingTokenPaid(b.id), 'Token mila - tareekh pakki')} data-testid="bk-token">💰 Token received</Button> : null}
            {b.status === 'token_paid' ? <Button size="sm" onClick={() => run(() => api.adminBookingDone(b.id), 'Done')} data-testid="bk-done">🏁 Mark done</Button> : null}
            <Button size="sm" variant="secondary" onClick={() => setAssign(true)} data-testid="bk-assign">👷 Provider / Assign</Button>
            <Button size="sm" variant="secondary" onClick={() => setEdit(!edit)} data-testid="bk-edit">✏️ Edit</Button>
            <Button size="sm" variant="danger" onClick={() => setCancel(true)} data-testid="bk-cancel">Cancel</Button>
          </div>
        ) : null}
        {edit && !closed ? (
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2" data-testid="bk-edit-form">
            {(['customerName', 'customerPhone', 'date', 'time', 'venue', 'pincode', 'remarks'] as const).map((k) => <Field key={k} label={k}><Input value={ef[k]} onChange={(e) => setEf({ ...ef, [k]: e.target.value })} data-testid={'be-' + k} /></Field>)}
            <Button className="col-span-2" onClick={() => run(async () => { await api.adminUpdateBooking(b.id, ef); setEdit(false); }, 'Update ho gaya (audit me likha)')} data-testid="bk-edit-save">Save</Button>
          </div>
        ) : null}
        <div className="flex gap-2"><TextArea rows={1} placeholder="Internal note (customer/provider ko nahi dikhta)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={() => run(() => api.adminUpdateBooking(b.id, { note }), 'Note save')}>Save note</Button></div>
        <details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Timeline</summary>{b.events.map((e, i) => <div key={i}>{when(e.at)} · {e.text}</div>)}</details>
      </div>
      <Modal open={assign} onClose={() => setAssign(false)} title={'Provider chuno · ' + b.shortId}>{assign ? <Assign b={b} onClose={() => { setAssign(false); onChanged(); }} /> : null}</Modal>
      <Modal open={cancel} onClose={() => setCancel(false)} title={'Cancel ' + b.shortId}>
        <div className="space-y-2" data-testid="cancel-box">
          <Field label="Kisne cancel kiya?"><Select value={by} onChange={(e) => setBy(e.target.value as typeof by)} data-testid="cancel-by"><option value="customer">Customer (timing ke hisab se refund)</option><option value="owner">Hum / Owner (poora refund)</option><option value="provider">Provider (poora refund)</option></Select></Field>
          <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="cancel-reason" /></Field>
          <p className="rounded-lg bg-amber-50 p-2 text-sm" data-testid="refund-preview">{b.tokenPaidAt ? 'Refund: ' + rupees(preview) + ' (token ' + rupees(b.tokenAmount) + ')' : 'Token nahi aaya tha, refund 0'}</p>
          <Button block variant="danger" onClick={() => run(async () => { await api.adminBookingCancel(b.id, by, reason); setCancel(false); }, 'Cancel ho gaya')} data-testid="cancel-go">Cancel pakka karo</Button>
        </div>
      </Modal>
    </Card>
  );
}

export function Bookings() {
  const { data, loading, reload } = useLive(() => api.adminBookings(), []);
  const [st, setSt] = useState<BookingStatus | 'all'>('all');
  const [q, setQ] = useState('');
  if (loading) return <Spinner />;
  const all = data ?? [];
  const s = q.trim().toLowerCase();
  const list = all.filter((b) => (st === 'all' || b.status === st) && (!s || (b.customerName + b.customerPhone + b.shortId + b.venue + b.serviceName).toLowerCase().includes(s)));
  const cnt = (x: BookingStatus) => all.filter((b) => b.status === x).length;
  const pill = (on: boolean) => 'rounded-full px-3 py-1 text-sm font-semibold ' + (on ? 'bg-leaf-600 text-white' : 'border bg-white');
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Bookings (gardener / decoration / bulk)</h1>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setSt('all')} className={pill(st === 'all')}>All ({all.length})</button>
        {[...BOOKING_PIPELINE, 'cancelled' as BookingStatus].map((x) => <button key={x} onClick={() => setSt(x)} className={pill(st === x)} data-testid={'bkf-' + x}>{LABEL[x]} ({cnt(x)})</button>)}
        <Input className="max-w-[12rem]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? <Card>Koi booking nahi.</Card> : null}
      {list.map((b) => <Card1 key={b.id} b={b} onChanged={() => void reload()} />)}
    </div>
  );
}

export function Services() {
  const { data, loading, reload } = useLive(() => api.adminServices(), []);
  const [ed, setEd] = useState<ServiceDef | null>(null);
  if (loading) return <Spinner />;
  const save = async () => { if (!ed) return; try { await api.adminSaveService(ed); toast('Service save'); setEd(null); await reload(); } catch (e) { toastErr(e); } };
  const num = (k: 'startingPrice' | 'tokenPercent' | 'minNoticeHours' | 'dailyCapacity' | 'commissionPercent', label: string) => ed ? <Field label={label}><Input type="number" value={ed[k]} onChange={(e) => setEd({ ...ed, [k]: Number(e.target.value) })} data-testid={'sv-' + k} /></Field> : null;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Services</h1>
      {(data ?? []).map((s) => (
        <Card key={s.key} className="flex flex-wrap items-center gap-3" >
          <span className="text-3xl">{s.emoji}</span>
          <div className="flex-1 text-sm"><div className="font-bold">{s.name.en} <span className="font-normal text-slate-500">({s.key})</span> {s.enabled ? <Badge tone="green">On</Badge> : <Badge tone="red">Off</Badge>}</div>
            <div className="text-xs text-slate-500">From {rupees(s.startingPrice)} · token {s.tokenPercent}% · notice {s.minNoticeHours}h · {s.dailyCapacity}/din · commission {s.commissionPercent}%</div></div>
          <Button size="sm" variant="secondary" onClick={() => setEd({ ...s })} data-testid={'sv-edit-' + s.key}>✏️ Edit</Button>
        </Card>
      ))}
      <Modal open={!!ed} onClose={() => setEd(null)} title="Service edit">
        {ed ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2"><Field label="Naam (English)"><Input value={ed.name.en ?? ''} onChange={(e) => setEd({ ...ed, name: { ...ed.name, en: e.target.value } })} /></Field>
              <Field label="Naam (Hindi)"><Input value={ed.name.hi ?? ''} onChange={(e) => setEd({ ...ed, name: { ...ed.name, hi: e.target.value } })} /></Field></div>
            <div className="grid grid-cols-2 gap-2"><Field label="Subtitle (English)"><Input value={ed.sub.en ?? ''} onChange={(e) => setEd({ ...ed, sub: { ...ed.sub, en: e.target.value } })} /></Field>
              <Field label="Subtitle (Hindi)"><Input value={ed.sub.hi ?? ''} onChange={(e) => setEd({ ...ed, sub: { ...ed.sub, hi: e.target.value } })} /></Field></div>
            <div className="grid grid-cols-3 gap-2">{num('startingPrice', 'Starting price ₹')}{num('tokenPercent', 'Token %')}{num('commissionPercent', 'Commission %')}{num('minNoticeHours', 'Min notice (ghante)')}{num('dailyCapacity', 'Din ki limit')}
              <Field label="Emoji"><Input value={ed.emoji} onChange={(e) => setEd({ ...ed, emoji: e.target.value })} /></Field></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ed.needsTime} onChange={(e) => setEd({ ...ed, needsTime: e.target.checked })} />Time bhi poochho</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ed.enabled} onChange={(e) => setEd({ ...ed, enabled: e.target.checked })} />Customer ko dikhao (On)</label>
            <Button block onClick={save} data-testid="sv-save">Save</Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
