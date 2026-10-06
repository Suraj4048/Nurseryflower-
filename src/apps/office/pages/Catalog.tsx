import { useRef, useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, PhotoThumb, Select, Spinner, toast, toastErr } from '../../../components/ui';
import { rupees } from '../../../lib/format';
import { pickName } from '../../../lib/i18n';
import { CategoryPicker, RIBBONS } from '../../../components/CategoryPicker';
import { compressToMaxKB } from '../../../lib/image';
import { CATEGORY_EMOJI, PARTNER_TYPES, type AdminPlant, type Nursery, type PartnerType } from '../../../lib/types';

export function Nurseries() {
  const { data, loading, reload } = useLive(() => api.adminNurseries(), []);
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState<Nursery | null>(null);
  const [f, setF] = useState({ legalName: '', brandName: '', ownerPhone: '', city: 'Lucknow', lat: '26.8467', lng: '80.9462', partnerType: 'nursery' as PartnerType });
  if (loading) return <Spinner />;
  const add = async () => {
    if (!f.legalName || !f.brandName) return toast('Naam aur brand naam bharo', 'err');
    try { await api.adminAddNursery({ ...f, lat: Number(f.lat), lng: Number(f.lng) }); toast('Nursery add ho gayi'); setOpen(false); setF({ legalName: '', brandName: '', ownerPhone: '', city: 'Lucknow', lat: '26.8467', lng: '80.9462', partnerType: 'nursery' }); await reload(); } catch (e) { toastErr(e); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Nurseries / Shops</h1><Button onClick={() => setOpen(true)}>＋ Add nursery</Button></div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">ID</th><th>Brand</th><th>Legal (sirf admin)</th><th>Type</th><th>Phone</th><th>Tier</th><th>Open</th><th>Status</th><th></th></tr></thead>
          <tbody>{(data ?? []).map((n) => (
            <tr key={n.id} className="border-t"><td className="p-2 font-mono text-xs">{n.uniqueId}</td><td className="font-semibold">{n.brandName}</td><td>{n.legalName}</td><td>{n.partnerType}</td><td>{n.ownerPhone}</td><td>{n.tier}</td>
              <td><button className={'rounded px-2 py-1 text-xs font-bold ' + (n.isOpen ? 'bg-leaf-100 text-leaf-800' : 'bg-slate-200 text-slate-700')}
                onClick={async () => { try { await api.adminSetNurseryOpen(n.id, !n.isOpen); await reload(); } catch (e) { toastErr(e); } }}>{n.isOpen ? '🟢 Open' : '🔴 Closed'}</button></td>
              <td><button className={'rounded px-2 py-1 text-xs font-bold ' + (n.status === 'active' ? 'bg-leaf-100 text-leaf-800' : 'bg-red-100 text-red-700')}
                onClick={async () => { try { await api.adminSetNurseryStatus(n.id, n.status === 'active' ? 'blocked' : 'active'); await reload(); } catch (e) { toastErr(e); } }}>{n.status}</button></td>
              <td><Button size="sm" variant="secondary" onClick={() => setEd({ ...n })}>✏️ Edit</Button></td></tr>))}</tbody></table>
      </div>
      <Modal open={!!ed} onClose={() => setEd(null)} title="Nursery edit">
        {ed ? (
          <div className="space-y-2">
            <Field label="Legal naam"><Input value={ed.legalName} onChange={(e) => setEd({ ...ed, legalName: e.target.value })} /></Field>
            <Field label="Brand naam"><Input value={ed.brandName} onChange={(e) => setEd({ ...ed, brandName: e.target.value })} /></Field>
            <Field label="Owner phone"><Input value={ed.ownerPhone} onChange={(e) => setEd({ ...ed, ownerPhone: e.target.value })} /></Field>
            <Field label="Type"><Select value={ed.partnerType} onChange={(e) => setEd({ ...ed, partnerType: e.target.value as PartnerType })}>{PARTNER_TYPES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <Field label="Tier"><Select value={ed.tier} onChange={(e) => setEd({ ...ed, tier: e.target.value as Nursery['tier'] })}>{['new', 'verified', 'trusted', 'star'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
            <div className="grid grid-cols-3 gap-2"><Field label="City"><Input value={ed.city} onChange={(e) => setEd({ ...ed, city: e.target.value })} /></Field>
              <Field label="Lat"><Input value={String(ed.lat)} onChange={(e) => setEd({ ...ed, lat: e.target.value as unknown as number })} /></Field><Field label="Lng"><Input value={String(ed.lng)} onChange={(e) => setEd({ ...ed, lng: e.target.value as unknown as number })} /></Field></div>
            <div className="grid grid-cols-2 gap-2"><Field label="Licence no"><Input value={ed.licenceNo ?? ''} onChange={(e) => setEd({ ...ed, licenceNo: e.target.value })} /></Field><Field label="GSTIN"><Input value={ed.gstin ?? ''} onChange={(e) => setEd({ ...ed, gstin: e.target.value })} /></Field></div>
            {['gardener', 'decorator', 'flower_shop', 'flower_vendor', 'nursery', 'at_home'].includes(ed.partnerType) ? (
              <div className="space-y-2 rounded-xl bg-slate-50 p-2" data-testid="provider-fields">
                <div className="text-xs font-bold text-slate-500">Service provider profile (booking ke liye)</div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Starting price ₹"><Input type="number" value={ed.startingPrice ?? ''} onChange={(e) => setEd({ ...ed, startingPrice: e.target.value === '' ? undefined : Number(e.target.value) })} data-testid="ne-price" /></Field>
                  <Field label="Radius km"><Input type="number" value={ed.serviceRadiusKm ?? ''} onChange={(e) => setEd({ ...ed, serviceRadiusKm: e.target.value === '' ? undefined : Number(e.target.value) })} data-testid="ne-radius" /></Field>
                  <Field label="Priority (bada = pehle)"><Input type="number" value={ed.priority ?? 0} onChange={(e) => setEd({ ...ed, priority: Number(e.target.value) })} data-testid="ne-priority" /></Field>
                </div>
                <Field label="Bio"><Input value={ed.bio ?? ''} onChange={(e) => setEd({ ...ed, bio: e.target.value })} /></Field>
                <Field label="Blocked dates (YYYY-MM-DD, comma se)"><Input value={(ed.blockedDates ?? []).join(',')} onChange={(e) => setEd({ ...ed, blockedDates: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>
              </div>
            ) : null}
            <Button block onClick={async () => {
              try { await api.adminUpdateNursery(ed.id, { startingPrice: ed.startingPrice, serviceRadiusKm: ed.serviceRadiusKm, bio: ed.bio, blockedDates: ed.blockedDates, priority: ed.priority, legalName: ed.legalName, brandName: ed.brandName, ownerPhone: ed.ownerPhone, partnerType: ed.partnerType, tier: ed.tier, city: ed.city, lat: Number(ed.lat), lng: Number(ed.lng), licenceNo: ed.licenceNo, gstin: ed.gstin });
                toast('Update ho gaya'); setEd(null); await reload(); } catch (e) { toastErr(e); } }}>Update</Button>
          </div>
        ) : null}
      </Modal>
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
  const closedIds = new Set((nurs.data ?? []).filter((n) => !n.isOpen || n.status !== 'active').map((n) => n.id));
  const [filter, setFilter] = useState<'pending' | 'live' | 'rejected' | 'all'>('pending');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [nid, setNid] = useState('');
  const [f, setF] = useState({ en: '', hi: '', cats: ['indoor'] as string[], ribbon: '', price: '', stock: '10', image: '', care: '', live: true });
  const [ep, setEp] = useState<{ p: AdminPlant; en: string; hi: string; cats: string[]; ribbon: string; price: string; stock: string; image: string; care: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickImg = async (cb: (d: string) => void, file?: File) => { if (file) { try { cb(await compressToMaxKB(file, 100, 900)); } catch (e) { toastErr(e); } } };
  if (plants.loading) return <Spinner />;
  const list = (plants.data ?? []).filter((p) => filter === 'all' || p.status === filter);
  const setStatus = async (id: string, st: 'live' | 'rejected', reason?: string) => { try { await api.adminSetPlantStatus(id, st, reason); await plants.reload(); } catch (e) { toastErr(e); } };
  const add = async () => {
    if (!nid) return toast('Pehle nursery chuno', 'err');
    if (!f.en.trim() || !(Number(f.price) > 0)) return toast('Naam aur price bharo', 'err');
    if (f.cats.length === 0) return toast('Kam se kam ek category chuno', 'err');
    try {
      await api.adminAddPlant(nid, { name: { en: f.en.trim(), ...(f.hi.trim() ? { hi: f.hi.trim() } : {}) }, category: f.cats[0], categories: f.cats, ribbon: f.ribbon || undefined, price: Number(f.price), stock: Number(f.stock), image: f.image || CATEGORY_EMOJI[f.cats[0]] || '🌱', care: f.care }, f.live);
      toast('Product add ho gaya'); setOpen(false); setStep(1); setF({ en: '', hi: '', cats: ['indoor'], ribbon: '', price: '', stock: '10', image: '', care: '', live: true }); await plants.reload();
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
          <div className="min-w-0 flex-1"><div className="truncate font-bold">{pickName(p.name, 'en')} <span className="text-xs font-normal text-slate-500">({p.categories.join(', ')})</span>{p.ribbon ? <span className="ml-1 rounded bg-red-600 px-1.5 text-[10px] font-bold text-white">{p.ribbon}</span> : null}</div>
            <div className="text-xs text-slate-500">{p.nurseryBrand} · {p.nurseryUid} · {rupees(p.price)} · stock {p.stock}</div></div>
          {p.status === 'live' && closedIds.has(p.nurseryId) ? <Badge tone="amber">Nursery band: showroom me nahi dikhega</Badge> : null}
          <Badge tone={p.status === 'live' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>{p.status}</Badge>
          <Button size="sm" variant="secondary" onClick={() => setEp({ p, en: p.name.en ?? '', hi: p.name.hi ?? '', cats: [...p.categories], ribbon: p.ribbon ?? '', price: String(p.price), stock: String(p.stock), image: p.image, care: p.care })}>✏️ Edit</Button>
          {p.status !== 'live' ? <Button size="sm" onClick={() => setStatus(p.id, 'live')}>Approve</Button> : null}
          {p.status !== 'rejected' ? <Button size="sm" variant="danger" onClick={() => { const r = prompt('Reject ka karan?'); if (r) void setStatus(p.id, 'rejected', r); }}>Reject</Button> : null}
        </Card>
      ))}
      <Modal open={!!ep} onClose={() => setEp(null)} title="Product edit">
        {ep ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">{ep.p.nurseryBrand} · {ep.p.nurseryUid}</div>
            <Field label="Naam (English)"><Input value={ep.en} onChange={(e) => setEp({ ...ep, en: e.target.value })} /></Field>
            <Field label="Naam (Hindi)"><Input value={ep.hi} onChange={(e) => setEp({ ...ep, hi: e.target.value })} /></Field>
            <Field label="Categories"><CategoryPicker value={ep.cats} onChange={(v) => setEp({ ...ep, cats: v })} /></Field>
            <Field label="Ribbon"><Select value={ep.ribbon} onChange={(e) => setEp({ ...ep, ribbon: e.target.value })}>{[...new Set([...RIBBONS, ep.ribbon])].map((r) => <option key={r} value={r}>{r || '(koi nahi)'}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Price"><Input value={ep.price} onChange={(e) => setEp({ ...ep, price: e.target.value })} inputMode="numeric" /></Field><Field label="Stock"><Input value={ep.stock} onChange={(e) => setEp({ ...ep, stock: e.target.value })} inputMode="numeric" /></Field></div>
            <Field label="Care tips"><Input value={ep.care} onChange={(e) => setEp({ ...ep, care: e.target.value })} /></Field>
            <div className="flex items-center gap-3"><PhotoThumb src={ep.image} className="h-14 w-14 rounded-lg" /><Button variant="secondary" onClick={() => document.getElementById('ep-file')?.click()}>📷 Photo badlo</Button>
              <input id="ep-file" type="file" accept="image/*" className="hidden" onChange={(e) => void pickImg((d) => setEp((x) => (x ? { ...x, image: d } : x)), e.target.files?.[0])} /></div>
            <Button block onClick={async () => {
              if (!ep.en.trim() || !(Number(ep.price) > 0)) return toast('Naam aur price bharo', 'err');
              if (ep.cats.length === 0) return toast('Kam se kam ek category chuno', 'err');
              try { await api.adminUpdatePlant(ep.p.id, { name: { ...ep.p.name, en: ep.en.trim(), ...(ep.hi.trim() ? { hi: ep.hi.trim() } : {}) }, categories: ep.cats, ribbon: ep.ribbon || undefined, price: Number(ep.price), stock: Number(ep.stock), image: ep.image, care: ep.care });
                toast('Update ho gaya'); setEp(null); await plants.reload(); } catch (e) { toastErr(e); } }}>Update</Button>
          </div>
        ) : null}
      </Modal>
      <Modal open={open} onClose={() => setOpen(false)} title={'Product add (step ' + step + '/2)'}>
        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Kis nursery ka product? (zaruri)"><Select value={nid} onChange={(e) => setNid(e.target.value)}><option value="">-- chuno --</option>{(nurs.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.brandName} ({n.uniqueId}){n.isOpen ? '' : ' - BAND'}</option>)}</Select></Field>
            {nid && closedIds.has(nid) ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Ye nursery abhi band hai. Product showroom me tab dikhega jab nursery Open ho (Nurseries page par Open dabao).</p> : null}
            <Button block disabled={!nid} onClick={() => setStep(2)}>Aage</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Naam (English)"><Input value={f.en} onChange={(e) => setF({ ...f, en: e.target.value })} /></Field>
            <Field label="Naam (Hindi, optional)"><Input value={f.hi} onChange={(e) => setF({ ...f, hi: e.target.value })} /></Field>
            <Field label="Categories (kai chun sakte ho)"><CategoryPicker value={f.cats} onChange={(v) => setF({ ...f, cats: v })} /></Field>
            <Field label="Ribbon (optional)"><Select value={f.ribbon} onChange={(e) => setF({ ...f, ribbon: e.target.value })}>{RIBBONS.map((r) => <option key={r} value={r}>{r || '(koi nahi)'}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Price"><Input value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} inputMode="numeric" /></Field><Field label="Stock"><Input value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} inputMode="numeric" /></Field></div>
            <Field label="Care tips"><Input value={f.care} onChange={(e) => setF({ ...f, care: e.target.value })} /></Field>
            <div className="flex items-center gap-3">{f.image ? <img src={f.image} alt="" className="h-14 w-14 rounded-lg object-cover" /> : null}<Button variant="secondary" onClick={() => fileRef.current?.click()}>📷 Photo (100 KB tak auto)</Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickImg((d) => setF((x) => ({ ...x, image: d })), e.target.files?.[0])} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.live} onChange={(e) => setF({ ...f, live: e.target.checked })} />Seedha live karo</label>
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setStep(1)}>Peeche</Button><Button className="flex-1" onClick={add}>Save</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
