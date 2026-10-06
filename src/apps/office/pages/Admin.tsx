import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, Field, Input, Spinner, toast, toastErr } from '../../../components/ui';
import { fmtDate } from '../../../lib/format';
import { CATEGORIES, ID_DOCS, type Category, type DocType, type Rule, type Settings } from '../../../lib/types';

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const REQ_DOCS: DocType[] = ['shop_photo_front', 'shop_photo_inside', 'home_garden_photo', 'selfie', 'fertilizer_licence', 'seed_licence', 'gst_certificate'];

function RuleCard({ rule, onSaved }: { rule: Rule; onSaved: () => void }) {
  const [r, setR] = useState(rule);
  const save = async () => { try { await api.adminUpdateRule(r); toast('Rule save'); onSaved(); } catch (e) { toastErr(e); } };
  const chip = (on: boolean) => 'rounded-full border px-2 py-0.5 text-xs font-semibold ' + (on ? 'border-leaf-600 bg-leaf-50 text-leaf-800' : 'border-slate-200 text-slate-500');
  return (
    <Card className="space-y-2">
      <div className="text-lg font-bold">{r.partnerType}</div>
      <div><div className="text-xs font-bold text-slate-500">Chalne wali ID (koi ek)</div><div className="flex flex-wrap gap-1">{ID_DOCS.map((d) => <button key={d} className={chip(r.allowedIdDocs.includes(d))} onClick={() => setR({ ...r, allowedIdDocs: toggle(r.allowedIdDocs, d) })}>{d}</button>)}</div></div>
      <div><div className="text-xs font-bold text-slate-500">Zaruri documents/photos</div><div className="flex flex-wrap gap-1">{REQ_DOCS.map((d) => <button key={d} className={chip(r.requiredDocs.includes(d))} onClick={() => setR({ ...r, requiredDocs: toggle(r.requiredDocs, d) })}>{d}</button>)}</div></div>
      <div><div className="text-xs font-bold text-slate-500">Allowed categories</div><div className="flex flex-wrap gap-1">{CATEGORIES.map((c) => <button key={c} className={chip(r.allowedCategories.includes(c as Category))} onClick={() => setR({ ...r, allowedCategories: toggle(r.allowedCategories, c as Category) })}>{c}</button>)}</div></div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" checked={r.licenceRequired} onChange={(e) => setR({ ...r, licenceRequired: e.target.checked })} />Licence zaruri</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={r.gstRequired} onChange={(e) => setR({ ...r, gstRequired: e.target.checked })} />GST zaruri</label>
        <label className="flex items-center gap-1">Probation max live products <input className="w-16 rounded border px-1" type="number" value={r.maxLiveProbation} onChange={(e) => setR({ ...r, maxLiveProbation: Number(e.target.value) })} /></label>
      </div>
      <Button size="sm" onClick={save}>Save rule</Button>
    </Card>
  );
}

export function Rules() {
  const { data, loading, reload } = useLive(() => api.listRules(), []);
  if (loading) return <Spinner />;
  return <div className="space-y-3"><h1 className="text-xl font-extrabold">Partner type rules</h1><p className="text-xs text-slate-500">Kaun si ID/photo/licence/GST chahiye, ye yaha se badlo. Code nahi badalna.</p>
    {(data ?? []).map((r) => <RuleCard key={r.partnerType + JSON.stringify(r)} rule={r} onSaved={reload} />)}</div>;
}

export function SettingsPage() {
  const { data, loading } = useLive(() => api.getSettings(), []);
  const [s, setS] = useState<Settings | null>(null);
  if (loading || !data) return <Spinner />;
  const cur = s ?? data;
  const num = (k: keyof Omit<Settings, 'split'>, label: string) => <Field label={label}><Input type="number" value={cur[k]} onChange={(e) => setS({ ...cur, [k]: Number(e.target.value) })} /></Field>;
  const sp = cur.split;
  const save = async () => {
    if (sp.nursery + sp.platform + sp.pool !== 100) return toast('Split ka total 100 hona chahiye', 'err');
    try { await api.adminSaveSettings(cur); toast('Settings save'); } catch (e) { toastErr(e); }
  };
  return (
    <div className="max-w-lg space-y-3"><h1 className="text-xl font-extrabold">Settings</h1>
      <Card className="space-y-2">
        {num('acceptSeconds', 'Partner accept timer (seconds)')}{num('cancelSeconds', 'Customer cancel window (seconds)')}{num('probationDays', 'Probation (days)')}
        {num('payoutHoldDays', 'Payout hold (days)')}{num('slaHours', 'Application review SLA (hours)')}
        <div className="grid grid-cols-3 gap-2">
          <Field label="Nursery %"><Input type="number" value={sp.nursery} onChange={(e) => setS({ ...cur, split: { ...sp, nursery: Number(e.target.value) } })} /></Field>
          <Field label="Platform %"><Input type="number" value={sp.platform} onChange={(e) => setS({ ...cur, split: { ...sp, platform: Number(e.target.value) } })} /></Field>
          <Field label="Pool %"><Input type="number" value={sp.pool} onChange={(e) => setS({ ...cur, split: { ...sp, pool: Number(e.target.value) } })} /></Field>
        </div>
        <Button block onClick={save}>Save</Button>
      </Card>
      {api.adminResetDemo ? <Card><div className="mb-1 font-bold">Demo data</div><Button variant="danger" onClick={async () => { if (confirm('Saara demo data reset?')) { await api.adminResetDemo!(); location.reload(); } }}>Reset demo data</Button></Card> : null}
    </div>
  );
}

export function Audit() {
  const { data, loading } = useLive(() => api.adminAudit(), []);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-2"><h1 className="text-xl font-extrabold">Audit log</h1>
      {(data ?? []).length === 0 ? <Card>Kuch nahi.</Card> : null}
      {(data ?? []).map((a) => <div key={a.id} className="rounded-lg border bg-white px-3 py-2 text-sm"><b>{a.action}</b> · {a.detail} <span className="text-xs text-slate-400">({a.actor}, {fmtDate(a.at)})</span></div>)}
    </div>
  );
}
