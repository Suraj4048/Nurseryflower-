import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, Spinner, StatusBadge, TextArea, toast, toastErr } from '../../../components/ui';
import { fmtDate } from '../../../lib/format';
import { PARTNER_TYPE_EMOJI, type Application, type Rule } from '../../../lib/types';

const CHECKS: [string, string][] = [
  ['id_checked', 'ID document asli aur saaf hai'], ['name_matches', 'ID ka naam = owner ka naam'], ['geotag_ok', 'Photo ki location dukaan/ghar se match'],
  ['phone_call_done', 'Phone/WhatsApp par baat ho gayi'], ['licence_checked', 'Licence valid (jaha zaruri)'], ['gst_checked', 'GST valid (jaha zaruri)'],
];

function Detail({ a, rule, onClose }: { a: Application; rule?: Rule; onClose: () => void }) {
  const [brand, setBrand] = useState(a.brandSuggestion || a.shopName);
  const [note, setNote] = useState(a.reviewNote ?? '');
  const [reason, setReason] = useState('');
  const [check, setCheck] = useState<Record<string, boolean>>(a.checklist);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const done = a.status === 'approved' || a.status === 'rejected';
  const run = async (fn: () => Promise<void>, ok: string, close = true) => { setBusy(true); try { await fn(); toast(ok); if (close) onClose(); } catch (e) { toastErr(e); } setBusy(false); };
  const showDoc = async (type: string) => { try { setUrls({ ...urls, [type]: await api.adminDocUrl(a.id, type) }); } catch (e) { toastErr(e); } };
  const relevant = CHECKS.filter(([k]) => (k !== 'licence_checked' || rule?.licenceRequired) && (k !== 'gst_checked' || rule?.gstRequired));
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><b>Type:</b> {PARTNER_TYPE_EMOJI[a.partnerType]} {a.partnerType}</div><div><b>Status:</b> {a.status}</div>
        <div><b>Shop:</b> {a.shopName}</div><div><b>Owner:</b> {a.ownerName}</div>
        <div><b>Phone:</b> {a.phone}</div><div><b>WhatsApp:</b> {a.whatsapp}</div>
        <div className="col-span-2"><b>Address:</b> {a.address}, {a.city} {a.pincode}</div>
        <div><b>UPI:</b> {a.upiId || '-'}</div><div><b>GST:</b> {a.gstin || '-'}</div>
        <div><b>Licence:</b> {a.licenceNo || '-'} {a.licenceExpiry}</div><div><b>Language:</b> {a.language}</div>
        <div className="col-span-2"><b>Consent:</b> {fmtDate(a.consentAt)}</div>
      </div>
      <div>
        <div className="mb-1 font-bold">Documents</div>
        <div className="grid grid-cols-3 gap-2">
          {a.docs.map((d) => (
            <div key={d.type} className="rounded-lg border p-1 text-center text-xs">
              {(urls[d.type] || d.thumb) ? <img src={urls[d.type] || d.thumb} alt="" className="h-24 w-full rounded object-cover" /> : <button className="h-24 w-full rounded bg-slate-100" onClick={() => showDoc(d.type)}>Dekho</button>}
              <div className="mt-1 font-semibold">{d.type}</div>{d.gps ? <Badge tone="green">GPS ✓</Badge> : <Badge>no GPS</Badge>}
            </div>
          ))}
        </div>
      </div>
      {!done ? (
        <>
          <div className="space-y-1">
            <div className="font-bold">Verification checklist (sab tick hone par hi approve)</div>
            {relevant.map(([k, label]) => (
              <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={!!check[k]} onChange={(e) => setCheck({ ...check, [k]: e.target.checked })} />{label}</label>
            ))}
            <Button size="sm" variant="secondary" onClick={() => run(() => api.adminUpdateApplication(a.id, { checklist: check, status: 'under_review' }), 'Checklist save', false)}>Checklist save</Button>
          </div>
          <Field label="Brand name (customer ko yahi dikhega)"><Input value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
          <Button block loading={busy} onClick={() => run(async () => { await api.adminUpdateApplication(a.id, { checklist: check }); await api.adminApprove(a.id, brand); }, 'Approved ✅')}>✅ Approve</Button>
          <Field label="Aur jankari chahiye? (partner ko dikhega)"><TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button block variant="amber" loading={busy} onClick={() => run(() => api.adminNeedInfo(a.id, note), 'Partner ko bheja')}>↩ Need more info</Button>
          <Field label="Reject ka karan"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <Button block variant="danger" loading={busy} onClick={() => run(() => api.adminReject(a.id, reason), 'Rejected')}>✖ Reject</Button>
        </>
      ) : <p className="text-slate-500">{a.status === 'rejected' ? 'Reject: ' + (a.rejectReason ?? '') : 'Approved. Nursery ID: ' + (a.nurseryId ?? '')}</p>}
    </div>
  );
}

export default function Applications() {
  const apps = useLive(() => api.adminApplications(), []);
  const rules = useLive(() => api.listRules(), []);
  const [sel, setSel] = useState<Application | null>(null);
  if (apps.loading) return <Spinner />;
  const list = apps.data ?? [];
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Partner applications</h1>
      {list.length === 0 ? <Card>Abhi koi application nahi.</Card> : null}
      {list.map((a) => (
        <Card key={a.id} onClick={() => setSel(a)} className="flex items-center gap-3">
          <span className="text-3xl">{PARTNER_TYPE_EMOJI[a.partnerType]}</span>
          <div className="flex-1"><div className="font-bold">{a.shopName} <span className="font-normal text-slate-500">· {a.ownerName}</span></div><div className="text-xs text-slate-500">{a.city} · {fmtDate(a.submittedAt)} · SLA {fmtDate(a.slaDueAt)}</div></div>
          <StatusBadge status={a.status} label={a.status} />
        </Card>
      ))}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.shopName}>
        {sel ? <Detail key={sel.id} a={sel} rule={rules.data?.find((r) => r.partnerType === sel.partnerType)} onClose={() => { setSel(null); void apps.reload(); }} /> : null}
      </Modal>
    </div>
  );
}
