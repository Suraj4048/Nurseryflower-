import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, PhotoThumb, Select, Spinner, toast, toastErr } from '../../../components/ui';
import { rupees } from '../../../lib/format';
import { pickName } from '../../../lib/i18n';
import { CATEGORIES, CATEGORY_EMOJI, PARTNER_TYPES, type Category, type PartnerType } from '../../../lib/types';

export function Nurseries() {
  const { data, loading, reload } = useLive(() => api.adminNurseries(), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ legalName: '', brandName: '', ownerPhone: '', city: 'Lucknow', lat: '26.8467', lng: '80.9462', partnerType: 'nursery' as PartnerType });
  if (loading) return <Spinner />;
  const add = async () => {
    if (!f.legalName || !f.brandName) return toast('Naam aur brand naam bharo', 'err');
    try { await api.adminAddNursery({ ...f, lat: Number(f.lat), lng: Number(f.lng) }); toast('Nursery add ho gayi'); setOpen(false); await reload(); } catch (e) { toastErr(e); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Nurseries / Shops</h1><Button onClick={() => setOpen(true)}>＋ Add nursery</Button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">ID</th><th>Brand</th><th>Legal (sirf admin)</th><th>Type</th><th>Phone</th><th>Tier</th><th>Open</th><th>Status</th></tr></thead>
          <tbody>{(data ?? []).map((n) => (
            <tr key={n.id} className="border-t"><td className="p-2 font-mono text-xs">{n.uniqueId}</td><td className="font-semibold">{n.brandName}</td><td>{n.legalName}</td><td>{n.partnerType}</td><td>{n.ownerPhone}</td><td>{n.tier}</td>
              <td>{n.isOpen ? '🟢' : '🔴'}</td>
              <td><button className={'rounded px-2 py-1 text-xs font-bold ' + (n.status === 'active' ? 'bg-leaf-100 text-leaf-800' : 'bg-red-100 text-red-700')}
                onClick={async () => { try { await api.adminSetNurseryStatus(n.id, n.status === 'active' ? 'blocked' : 'active'); await reload(); } catch (e) { toastErr(e); } }}>{n.status}</button></td></tr>))}</tbody></table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Nursery add karo">
        <div className="space-y-2">
          <Field label="Legal naam"><Input value={f.legalName} onChange={(e) => setF({ ...f, legalName: e.target.value })} /></Field>
          <Field label="Brand naam (customer ko dikhega)"><Input value={f.brandName} onChange={(e) => setF({ ...f, brandName: e.target.value })} /></Field>
          <Field label="Owner phone"><Input value={f.ownerPhone} onChange={(e) => setF({ ...f, ownerPhone: e.target.value })} /></Field>
          <Field label="Type"><Select value={f.partnerType} onChange={(e) => setF({ ...f, partnerType: e.target.value as PartnerType })}>{PARTNER_TYPES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <div className="grid grid-cols-3 gap-2"><Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="Lat"><Input value={f.lat} onChange={(e) => setF({ ...f, lat: e.target.value })} /></Field><Field label="Lng"><Input value={f.lng} onChange={(e) => setF({ ...f, lng: e.target.value })} /></Field></div>
          <Button block onClick={add}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}

export function Products() {
  const plants = useLive(() => api.adminPlants(), []);
  const nurs = useLive(() => api.adminNurseries(), []);
  const [filter, setFilter] = useState<'pending' | 'live' | 'rejected' | 'all'>('pending');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [nid, setNid] = useState('');
  const [f, setF] = useState({ en: '', hi: '', category: 'indoor' as Category, price: '', stock: '10', image: '', care: '', live: true });
  if (plants.loading) return <Spinner />;
  const list = (plants.data ?? []).filter((p) => filter === 'all' || p.status === filter);
  const setStatus = async (id: string, st: 'live' | 'rejected', reason?: string) => { try { await api.adminSetPlantStatus(id, st, reason); await plants.reload(); } catch (e) { toastErr(e); } };
  const add = async () => {
    if (!nid) return toast('Pehle nursery chuno', 'err');
    if (!f.en.trim() || !(Number(f.price) > 0)) return toast('Naam aur price bharo', 'err');
    try {
      await api.adminAddPlant(nid, { name: { en: f.en.trim(), ...(f.hi.trim() ? { hi: f.hi.trim() } : {}) }, category: f.category, price: Number(f.price), stock: Number(f.stock), image: f.image || CATEGORY_EMOJI[f.category], care: f.care }, f.live);
      toast('Product add ho gaya'); setOpen(false); setStep(1); await plants.reload();
    } catch (e) { toastErr(e); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold">Products</h1>
        {(['pending', 'live', 'rejected', 'all'] as const).map((s) => <button key={s} onClick={() => setFilter(s)} className={'rounded-full px-3 py-1 text-sm font-semibold ' + (filter === s ? 'bg-leaf-600 text-white' : 'bg-white border')}>{s}</button>)}
        <Button className="ml-auto" onClick={() => { setStep(1); setOpen(true); }}>＋ Add product</Button></div>
      {list.length === 0 ? <Card>Kuch nahi hai.</Card> : null}
      {list.map((p) => (
        <Card key={p.id} className="flex items-center gap-3">
          <PhotoThumb src={p.image} className="h-14 w-14 rounded-lg" />
          <div className="min-w-0 flex-1"><div className="truncate font-bold">{pickName(p.name, 'en')} <span className="text-xs font-normal text-slate-500">({p.category})</span></div>
            <div className="text-xs text-slate-500">{p.nurseryBrand} · {p.nurseryUid} · {rupees(p.price)} · stock {p.stock}</div></div>
          <Badge tone={p.status === 'live' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>{p.status}</Badge>
          {p.status !== 'live' ? <Button size="sm" onClick={() => setStatus(p.id, 'live')}>Approve</Button> : null}
          {p.status !== 'rejected' ? <Button size="sm" variant="danger" onClick={() => { const r = prompt('Reject ka karan?'); if (r) void setStatus(p.id, 'rejected', r); }}>Reject</Button> : null}
        </Card>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title={'Product add (step ' + step + '/2)'}>
        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Kis nursery ka product? (zaruri)"><Select value={nid} onChange={(e) => setNid(e.target.value)}><option value="">-- chuno --</option>{(nurs.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.brandName} ({n.uniqueId})</option>)}</Select></Field>
            <Button block disabled={!nid} onClick={() => setStep(2)}>Aage</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Naam (English)"><Input value={f.en} onChange={(e) => setF({ ...f, en: e.target.value })} /></Field>
            <Field label="Naam (Hindi, optional)"><Input value={f.hi} onChange={(e) => setF({ ...f, hi: e.target.value })} /></Field>
            <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Price"><Input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="numeric" /></Field><Field label="Stock"><Input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} inputMode="numeric" /></Field></div>
            <Field label="Care tips"><Input value={f.care} onChange={(e) => setF({ ...f, care: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.live} onChange={(e) => setF({ ...f, live: e.target.checked })} />Seedha live karo</label>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setStep(1)}>Peeche</Button><Button className="flex-1" onClick={add}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
