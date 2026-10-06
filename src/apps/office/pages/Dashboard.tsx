import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Card, Spinner } from '../../../components/ui';
import { rupees } from '../../../lib/format';

export default function Dashboard() {
  const orders = useLive(() => api.adminOrders(), []);
  const apps = useLive(() => api.adminApplications(), []);
  const plants = useLive(() => api.adminPlants(), []);
  const nurs = useLive(() => api.adminNurseries(), []);
  const comps = useLive(() => api.adminComplaints(), []);
  const settings = useLive(() => api.getSettings(), []);
  if (orders.loading || apps.loading || plants.loading || nurs.loading || comps.loading || !settings.data) return <Spinner />;
  const o = orders.data ?? [];
  const good = o.filter((x) => !['cancelled', 'rejected', 'expired'].includes(x.status));
  const gmv = good.reduce((s, x) => s + x.subtotal, 0);
  const s = settings.data.split;
  const fees = good.reduce((a, x) => a + x.deliveryFee, 0);
  const stat = (label: string, v: string | number, tone = 'bg-white') => <Card className={tone}><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-extrabold">{v}</div></Card>;
  const cnt = (st: string) => o.filter((x) => x.status === st).length;
  const top = new Map<string, number>();
  good.forEach((x) => x.items.forEach((i) => top.set(i.name, (top.get(i.name) ?? 0) + i.qty)));
  const topList = [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat('Total orders', o.length)}
        {stat('GMV (products)', rupees(gmv), 'bg-leaf-50')}
        {stat('Platform kamai (' + s.platform + '%)', rupees((gmv * s.platform) / 100), 'bg-leaf-50')}
        {stat('Delivery fees (customer)', rupees(fees))}
        {stat('Applications pending', (apps.data ?? []).filter((a) => ['submitted', 'under_review', 'need_more_info'].includes(a.status)).length, 'bg-amber-50')}
        {stat('Products pending', (plants.data ?? []).filter((p) => p.status === 'pending').length, 'bg-amber-50')}
        {stat('Nurseries active', (nurs.data ?? []).filter((n) => n.status === 'active').length)}
        {stat('Open complaints', (comps.data ?? []).filter((c) => c.status === 'open').length, 'bg-red-50')}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card><div className="mb-2 font-bold">Orders by status</div>
          {['new', 'accepted', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'rejected', 'expired'].map((st) => <div key={st} className="flex justify-between border-b py-1 text-sm"><span>{st}</span><b>{cnt(st)}</b></div>)}</Card>
        <Card><div className="mb-2 font-bold">Top products</div>{topList.length ? topList.map(([n, q]) => <div key={n} className="flex justify-between border-b py-1 text-sm"><span>{n}</span><b>{q}</b></div>) : <div className="text-sm text-slate-500">Abhi koi order nahi.</div>}
          <div className="mt-3 text-xs text-slate-500">Split: nursery {s.nursery}% / platform {s.platform}% / pool {s.pool}%</div></Card>
      </div>
    </div>
  );
}
