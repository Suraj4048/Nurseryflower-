import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, Spinner, StatusBadge, toast, toastErr } from '../../../components/ui';
import { fmtDate, rupees } from '../../../lib/format';
import type { DeliveryPartner } from '../../../lib/types';

export function Orders() {
  const { data, loading, reload } = useLive(() => api.adminOrders(), []);
  if (loading) return <Spinner />;
  const run = async (fn: () => Promise<void>) => { try { await fn(); await reload(); } catch (e) { toastErr(e); } };
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Orders</h1>
      {(data ?? []).length === 0 ? <Card>Abhi koi order nahi.</Card> : null}
      {[...(data ?? [])].sort((a, b) => b.createdAt - a.createdAt).map((o) => (
        <Card key={o.id} className="space-y-1">
          <div className="flex items-center justify-between"><b>#{o.shortId} · {o.nurseryBrand}</b><StatusBadge status={o.status} label={o.status} /></div>
          <div className="text-sm text-slate-600">{o.items.map((i) => i.name + '×' + i.qty).join(', ')}</div>
          <div className="text-xs text-slate-500">{o.customerName} {o.customerPhone} · {o.address} · {o.paymentMethod} · {fmtDate(o.createdAt)}</div>
          <div className="text-xs text-slate-500">Delivery: {o.deliveryPartnerName ?? '-'} {rupees(o.deliveryFee)} · Tried: {o.triedNurseryIds.length}</div>
          <div className="flex items-center justify-between"><b>{rupees(o.total)}</b>
            <div className="flex gap-2">
              {['accepted', 'packed', 'out_for_delivery'].includes(o.status) ? <Button size="sm" onClick={() => run(() => api.adminAdvanceOrder(o.id))}>Aage badhao →</Button> : null}
              {['new', 'accepted', 'packed'].includes(o.status) ? <Button size="sm" variant="danger" onClick={() => run(() => api.adminCancelOrder(o.id))}>Cancel</Button> : null}
            </div></div>
        </Card>
      ))}
    </div>
  );
}

export function Delivery() {
  const { data, loading, reload } = useLive(() => api.adminAllDeliveryPartners(), []);
  const [edit, setEdit] = useState<Partial<DeliveryPartner> | null>(null);
  if (loading) return <Spinner />;
  const save = async () => {
    if (!edit?.name) return toast('Naam bharo', 'err');
    try { await api.adminSaveDeliveryPartner({ ...edit, name: edit.name, ratePerKm: Number(edit.ratePerKm ?? 8), minCharge: Number(edit.minCharge ?? 50), vehicleTypes: edit.vehicleTypes ?? ['bike'], active: edit.active ?? true }); setEdit(null); await reload(); } catch (e) { toastErr(e); }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Delivery partners</h1><Button onClick={() => setEdit({ name: '', ratePerKm: 8, minCharge: 50, active: true, vehicleTypes: ['bike'] })}>＋ Add</Button></div>
      <p className="text-xs text-slate-500">Customer ko sabse sasta active partner auto-select hota hai. Fee = max(min charge, rate × km).</p>
      {(data ?? []).map((d) => (
        <Card key={d.id} className="flex items-center gap-3"><div className="flex-1"><b>{d.name}</b><div className="text-xs text-slate-500">₹{d.ratePerKm}/km · min ₹{d.minCharge} · {d.vehicleTypes.join(', ')}</div></div>
          <Badge tone={d.active ? 'green' : 'gray'}>{d.active ? 'active' : 'off'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => setEdit(d)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={async () => { if (confirm('Delete?')) { try { await api.adminDeleteDeliveryPartner(d.id); await reload(); } catch (e) { toastErr(e); } } }}>✕</Button></Card>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Delivery partner">
        {edit ? <div className="space-y-2">
          <Field label="Naam"><Input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Rate/km"><Input value={String(edit.ratePerKm ?? '')} onChange={(e) => setEdit({ ...edit, ratePerKm: Number(e.target.value) })} inputMode="numeric" /></Field>
            <Field label="Min charge"><Input value={String(edit.minCharge ?? '')} onChange={(e) => setEdit({ ...edit, minCharge: Number(e.target.value) })} inputMode="numeric" /></Field></div>
          <Field label="Booking link (optional)"><Input value={edit.deepLink ?? ''} onChange={(e) => setEdit({ ...edit, deepLink: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Active</label>
          <Button block onClick={save}>Save</Button></div> : null}
      </Modal>
    </div>
  );
}

export function Complaints() {
  const { data, loading, reload } = useLive(() => api.adminComplaints(), []);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Complaints / replacement claims</h1>
      {(data ?? []).length === 0 ? <Card>Koi complaint nahi.</Card> : null}
      {(data ?? []).map((c) => (
        <Card key={c.id} className="space-y-1"><div className="flex justify-between"><b>Order {c.orderId}</b><Badge tone={c.status === 'open' ? 'amber' : 'green'}>{c.status}</Badge></div>
          <div className="text-sm">{c.reason}</div><div className="text-xs text-slate-500">{fmtDate(c.createdAt)}</div>
          {c.status === 'open' ? <Button size="sm" onClick={async () => { const r = prompt('Resolution (e.g. free replacement bheja)'); if (r) { try { await api.adminResolveComplaint(c.id, r); await reload(); } catch (e) { toastErr(e); } } }}>Resolve</Button> : <div className="text-xs text-leaf-700">{c.resolution}</div>}</Card>
      ))}
    </div>
  );
}
