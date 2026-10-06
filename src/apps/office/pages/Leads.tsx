import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Input, Select, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { LEAD_STATUSES, type Lead, type LeadStatus } from '../../../lib/types';

const LABEL: Record<LeadStatus, string> = { new: 'New', called: 'Called', confirmed: 'Confirmed', done: 'Done', rejected: 'Rejected' };
const tone = (s: LeadStatus) => (s === 'new' ? 'amber' : s === 'done' || s === 'confirmed' ? 'green' : s === 'rejected' ? 'red' : 'blue') as 'amber' | 'green' | 'red' | 'blue';
const when = (t: number) => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function LeadCard({ l, onChanged }: { l: Lead; onChanged: () => void }) {
  const [note, setNote] = useState(l.note);
  const [copied, setCopied] = useState(false);
  const setStatus = async (s: LeadStatus) => { try { await api.adminUpdateLead(l.id, { status: s }); onChanged(); } catch (e) { toastErr(e); } };
  const saveNote = async () => { try { await api.adminUpdateLead(l.id, { note }); toast('Note save ho gaya'); onChanged(); } catch (e) { toastErr(e); } };
  const del = async () => { if (!confirm(l.name + ' ki lead hatayein?')) return; try { await api.adminDeleteLead(l.id); onChanged(); } catch (e) { toastErr(e); } };
  const copy = async () => { try { await navigator.clipboard.writeText(l.phone); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast(l.phone); } };
  return (
    <Card className="space-y-2" >
      <div data-testid="lead-card" className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-extrabold">{l.name}</span>
          <Badge tone={tone(l.status)}>{LABEL[l.status]}</Badge>
          <span className="ml-auto text-xs text-slate-500">{l.formName} · {when(l.createdAt)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono font-bold">{l.phone}</span>
          <a className="rounded-lg bg-leaf-600 px-3 py-1 text-xs font-bold text-white" href={'tel:' + l.phone}>📞 Call</a>
          <a className="rounded-lg bg-green-100 px-3 py-1 text-xs font-bold text-green-800" href={'https://wa.me/91' + l.phone} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <button className="rounded-lg border px-3 py-1 text-xs font-bold" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="space-y-1 rounded-xl bg-slate-50 p-2 text-sm">
          {l.answers.length === 0 ? <span className="text-slate-400">Koi extra jawab nahi</span> : null}
          {l.answers.map((a) => (
            <div key={a.id}><span className="text-xs font-semibold text-slate-500">{a.label}: </span>
              {a.type === 'photo' ? <img src={a.value} alt="" className="mt-1 h-24 rounded-lg object-cover" /> : <span className="whitespace-pre-wrap">{a.value}</span>}</div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {LEAD_STATUSES.map((s) => <button key={s} onClick={() => void setStatus(s)} className={'rounded-full border px-3 py-1 text-xs font-bold ' + (l.status === s ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-slate-300 bg-white')}>{LABEL[s]}</button>)}
        </div>
        <div className="flex gap-2"><TextArea rows={1} placeholder="Internal note (customer ko nahi dikhta)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={saveNote}>Save note</Button><Button size="sm" variant="danger" onClick={del}>Delete</Button></div>
      </div>
    </Card>
  );
}

export function Leads() {
  const { data, loading, reload } = useLive(() => api.adminLeads(), []);
  const [st, setSt] = useState<LeadStatus | 'all'>('all');
  const [form, setForm] = useState('');
  const [q, setQ] = useState('');
  if (loading) return <Spinner />;
  const all = data ?? [];
  const forms = [...new Map(all.map((l) => [l.formId, l.formName])).entries()];
  const s = q.trim().toLowerCase();
  const list = all.filter((l) => (st === 'all' || l.status === st) && (!form || l.formId === form)
    && (!s || (l.name + ' ' + l.phone + ' ' + l.answers.map((a) => (a.type === 'photo' ? '' : a.value)).join(' ')).toLowerCase().includes(s)));
  const cnt = (x: LeadStatus) => all.filter((l) => l.status === x).length;
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-extrabold">Leads inbox</h1>
      <p className="text-xs text-slate-500">Customer ka number sirf yaha (admin ko) dikhta hai. Kisi partner ko kabhi nahi.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setSt('all')} className={'rounded-full px-3 py-1 text-sm font-semibold ' + (st === 'all' ? 'bg-leaf-600 text-white' : 'border bg-white')}>All ({all.length})</button>
        {LEAD_STATUSES.map((x) => <button key={x} onClick={() => setSt(x)} className={'rounded-full px-3 py-1 text-sm font-semibold ' + (st === x ? 'bg-leaf-600 text-white' : 'border bg-white')}>{LABEL[x]} ({cnt(x)})</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Search: naam, phone, jawab" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={form} onChange={(e) => setForm(e.target.value)}><option value="">Saare forms</option>{forms.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select>
      </div>
      {list.length === 0 ? <Card>{all.length === 0 ? 'Abhi koi lead nahi aayi. Showroom ka form bharne par yaha dikhegi.' : 'Is filter me koi lead nahi.'}</Card> : null}
      {list.map((l) => <LeadCard key={l.id + l.updatedAt} l={l} onChanged={reload} />)}
    </div>
  );
}
