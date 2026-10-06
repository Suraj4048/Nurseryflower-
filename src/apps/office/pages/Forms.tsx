import { useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { FIELD_TYPES, FORM_PLACEMENTS, type CustomForm, type FieldType, type FormField, type FormPlacement } from '../../../lib/types';

const PLACE_LABEL: Record<FormPlacement, string> = {
  below_search: 'Search bar ke neeche', below_categories: 'Categories ke neeche', mid: 'Home ke beech (products ke beech)', bottom: 'Sabse neeche',
};
const TYPE_LABEL: Record<FieldType, string> = {
  text: 'Chhota text', number: 'Number', phone: 'Phone', textarea: 'Lamba text (remarks)', select: 'Dropdown', radio: 'Ek chunna (radio)', checkbox: 'Kai chunna (checkbox)', date: 'Tareekh', time: 'Samay', photo: 'Photo (100 KB tak)',
};
const HAS_OPTS: FieldType[] = ['select', 'radio', 'checkbox'];

type EField = FormField & { _opt: string };
type EForm = Omit<CustomForm, 'fields'> & { fields: EField[] };

const optToText = (o?: Record<string, string>[]) => (o ?? []).map((x) => (x.hi && x.hi !== x.en ? `${x.en} | ${x.hi}` : x.en)).join('\n');
const textToOpt = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [en, hi] = l.split('|').map((x) => x.trim()); return { en, hi: hi || en }; });
const rid = (p: string) => p + Math.random().toString(36).slice(2, 7);
const toEdit = (f: CustomForm): EForm => ({ ...JSON.parse(JSON.stringify(f)), fields: f.fields.map((x) => ({ ...JSON.parse(JSON.stringify(x)), _opt: optToText(x.options) })) });
const blank = (): EForm => ({
  id: rid('form_'), name: '', enabled: true, placement: 'bottom', emoji: '💬',
  buttonText: { en: 'Ask us', hi: 'पूछ लो' }, buttonSub: { en: '', hi: '' }, title: { en: '', hi: '' }, description: { en: '', hi: '' },
  successText: { en: 'Thank you! We will call you soon.', hi: 'धन्यवाद! हम जल्दी आपको कॉल करेंगे।' },
  fields: [{ id: rid('f'), type: 'text', label: { en: '', hi: '' }, required: false, _opt: '' }],
});

export function Forms() {
  const { data, loading, reload } = useLive(() => api.adminAllForms(), []);
  const [ed, setEd] = useState<EForm | null>(null);
  if (loading) return <Spinner />;
  const setField = (i: number, patch: Partial<EField>) => setEd(ed && { ...ed, fields: ed.fields.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const move = (i: number, d: number) => {
    if (!ed) return; const j = i + d; if (j < 0 || j >= ed.fields.length) return;
    const a = [...ed.fields]; [a[i], a[j]] = [a[j], a[i]]; setEd({ ...ed, fields: a });
  };
  const save = async () => {
    if (!ed) return;
    const fields: FormField[] = ed.fields.map(({ _opt, ...f }) => (HAS_OPTS.includes(f.type) ? { ...f, options: textToOpt(_opt) } : { ...f, options: undefined }));
    try { await api.adminSaveForm({ ...ed, fields }); toast('Form save ho gaya'); setEd(null); await reload(); } catch (e) { toastErr(e); }
  };
  const del = async (f: CustomForm) => { if (!confirm(f.name + ' form hatayein? (purani leads bachi rahengi)')) return; try { await api.adminDeleteForm(f.id); await reload(); } catch (e) { toastErr(e); } };
  const toggle = async (f: CustomForm) => { try { await api.adminSaveForm({ ...f, enabled: !f.enabled }); await reload(); } catch (e) { toastErr(e); } };
  const two = (label: string, key: 'buttonText' | 'buttonSub' | 'title' | 'description' | 'successText') => ed ? (
    <div className="grid grid-cols-2 gap-2">
      <Field label={label + ' (English)'}><Input value={ed[key].en ?? ''} onChange={(e) => setEd({ ...ed, [key]: { ...ed[key], en: e.target.value } })} /></Field>
      <Field label={label + ' (Hindi)'}><Input value={ed[key].hi ?? ''} onChange={(e) => setEd({ ...ed, [key]: { ...ed[key], hi: e.target.value } })} /></Field>
    </div>) : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Forms (Form Builder)</h1><Button onClick={() => setEd(blank())}>＋ Naya form</Button></div>
      <p className="text-xs text-slate-500">Yaha form banao, kaun se fields chahiye chuno, aur Home page par kahan button dikhe wo chuno. Customer ke bhare jawab "Leads" me aate hain.</p>
      {(data ?? []).map((f) => (
        <Card key={f.id} className="flex flex-wrap items-center gap-3">
          <span className="text-3xl">{f.emoji}</span>
          <div className="min-w-0 flex-1"><div className="font-bold">{f.name}</div>
            <div className="text-xs text-slate-500">{PLACE_LABEL[f.placement]} · {f.fields.length} fields</div>
            <div className="font-mono text-[11px] text-slate-400">id: {f.id}</div></div>
          <Badge tone={f.enabled ? 'green' : 'gray'}>{f.enabled ? 'on' : 'off'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => void toggle(f)}>{f.enabled ? 'Band karo' : 'Chalu karo'}</Button>
          <Button size="sm" variant="secondary" onClick={() => setEd(toEdit(f))}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => void del(f)}>Delete</Button>
        </Card>
      ))}
      {(data ?? []).length === 0 ? <Card>Abhi koi form nahi hai. "Naya form" dabao.</Card> : null}
      <Modal open={!!ed} onClose={() => setEd(null)} title="Form edit">
        {ed ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Form ka naam (sirf admin ko)"><Input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></Field>
              <Field label="Emoji"><Input value={ed.emoji} onChange={(e) => setEd({ ...ed, emoji: e.target.value })} /></Field>
            </div>
            <Field label="Home page par button kahan dikhe"><Select value={ed.placement} onChange={(e) => setEd({ ...ed, placement: e.target.value as FormPlacement })}>{FORM_PLACEMENTS.map((p) => <option key={p} value={p}>{PLACE_LABEL[p]}</option>)}</Select></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ed.enabled} onChange={(e) => setEd({ ...ed, enabled: e.target.checked })} />Chalu (customer ko dikhe)</label>
            {two('Button ka text', 'buttonText')}{two('Button ke neeche chhota text', 'buttonSub')}{two('Form ka title', 'title')}{two('Form ka description', 'description')}{two('Bhejne ke baad message', 'successText')}
            <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">Naam aur mobile number har form me apne aap rehte hain (zaruri). Neeche ke fields aap chunte ho.</div>
            {ed.fields.map((f, i) => (
              <div key={f.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <Select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })}>{FIELD_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</Select>
                  <button className="rounded border px-2 py-1" onClick={() => move(i, -1)} aria-label="up">↑</button>
                  <button className="rounded border px-2 py-1" onClick={() => move(i, 1)} aria-label="down">↓</button>
                  <button className="rounded border border-red-300 px-2 py-1 text-red-600" onClick={() => setEd({ ...ed, fields: ed.fields.filter((_, j) => j !== i) })} aria-label="remove field">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Label (English)" value={f.label.en ?? ''} onChange={(e) => setField(i, { label: { ...f.label, en: e.target.value } })} />
                  <Input placeholder="Label (Hindi)" value={f.label.hi ?? ''} onChange={(e) => setField(i, { label: { ...f.label, hi: e.target.value } })} />
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />Zaruri (mandatory)</label>
                {HAS_OPTS.includes(f.type) ? <Field label="Vikalp (har line me ek). Hindi ke liye: English | हिन्दी"><TextArea rows={3} value={f._opt} onChange={(e) => setField(i, { _opt: e.target.value })} /></Field> : null}
              </div>
            ))}
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setEd({ ...ed, fields: [...ed.fields, { id: rid('f'), type: 'text', label: { en: '', hi: '' }, required: false, _opt: '' }] })}>＋ Field</Button>
              <Button className="flex-1" onClick={save}>Save form</Button></div>
            <p className="text-xs text-slate-500">Slideshow ke button se ye form kholna ho to action "form" me ye id likho: <span className="font-mono">{ed.id}</span></p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
