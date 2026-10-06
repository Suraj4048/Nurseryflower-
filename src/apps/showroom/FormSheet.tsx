import { useContext, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useLive } from '../../components/hooks';
import { Button, Input, Modal, Select, TextArea, toast, toastErr } from '../../components/ui';
import { isPhone } from '../../lib/format';
import { pickName, useLang } from '../../lib/i18n';
import { compressToMaxKB } from '../../lib/image';
import type { CustomForm, FormField, FormPlacement } from '../../lib/types';
import { SessionCtx } from './ctx';

// Kaun sa form khula hai (slide/button se bhi khul sakta hai)
let openId: string | null = null;
const subs = new Set<() => void>();
export function openForm(id: string) { openId = id; subs.forEach((f) => f()); }
function closeForm() { openId = null; subs.forEach((f) => f()); }
function useOpenId() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return openId;
}

/** Home page par form ke button (admin ne jo jagah chuni hai wahi). */
export function FormButtons({ placement }: { placement: FormPlacement }) {
  const { lang } = useLang();
  const { data } = useLive(() => api.listForms(), []);
  const list = (data ?? []).filter((f) => f.placement === placement);
  if (list.length === 0) return null;
  return (
    <div className="my-3 space-y-2">
      {list.map((f) => (
        <button key={f.id} onClick={() => openForm(f.id)} data-testid={'form-btn-' + f.id}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-leaf-600 bg-white p-3 text-left active:scale-[0.99]">
          <span className="text-3xl">{f.emoji || '💬'}</span>
          <span className="min-w-0"><span className="block font-extrabold text-leaf-800">{pickName(f.buttonText, lang)}</span>
            <span className="block text-xs text-slate-500">{pickName(f.buttonSub, lang)}</span></span>
        </button>
      ))}
    </div>
  );
}

function FieldInput({ f, value, onChange }: { f: FormField; value: string; onChange: (v: string) => void }) {
  const { t, lang } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const opts = (f.options ?? []).map((o) => pickName(o, lang));
  if (f.type === 'textarea') return <TextArea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === 'select') return <Select value={value} onChange={(e) => onChange(e.target.value)}><option value="">{t('f_choose')}</option>{opts.map((o) => <option key={o}>{o}</option>)}</Select>;
  if (f.type === 'radio') return <div className="space-y-1">{opts.map((o) => <label key={o} className="flex items-center gap-2 text-base"><input type="radio" name={f.id} checked={value === o} onChange={() => onChange(o)} />{o}</label>)}</div>;
  if (f.type === 'checkbox') {
    const cur = value ? value.split(', ') : [];
    return <div className="space-y-1">{opts.map((o) => <label key={o} className="flex items-center gap-2 text-base"><input type="checkbox" checked={cur.includes(o)} onChange={() => onChange((cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]).join(', '))} />{o}</label>)}</div>;
  }
  if (f.type === 'photo') {
    return (
      <div className="flex items-center gap-3">
        {value ? <img src={value} alt="" className="h-16 w-16 rounded-lg object-cover" /> : null}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { onChange(await compressToMaxKB(file, 100, 900)); } catch (er) { toastErr(er); } } }} />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>📷 {t('f_photo')}</Button>
        {value ? <button type="button" className="text-sm text-red-600" onClick={() => onChange('')}>✕</button> : null}
      </div>
    );
  }
  const type = f.type === 'number' ? 'text' : f.type === 'phone' ? 'tel' : f.type;
  return <Input type={type} inputMode={f.type === 'number' || f.type === 'phone' ? 'numeric' : undefined} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function FormBody({ form, onClose }: { form: CustomForm; onClose: () => void }) {
  const { t, lang } = useLang();
  const sess = useContext(SessionCtx);
  const [name, setName] = useState(sess.user?.name && sess.user.name !== 'Customer' ? sess.user.name : '');
  const [phone, setPhone] = useState(sess.user?.phone ?? '');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    setErr('');
    if (name.trim().length < 2) return setErr(t('f_err_name'));
    if (!isPhone(phone)) return setErr(t('f_err_phone'));
    for (const f of form.fields) if (f.required && !(vals[f.id] ?? '').trim()) return setErr(t('f_err_required') + ': ' + pickName(f.label, lang));
    setBusy(true);
    try {
      await api.submitLead({ formId: form.id, name, phone, answers: form.fields.map((f) => ({ id: f.id, value: vals[f.id] ?? '' })) });
      setSent(true);
    } catch (e) { toastErr(e); setErr((e as Error).message); }
    setBusy(false);
  };
  if (sent) {
    return (
      <div className="space-y-3 py-4 text-center" data-testid="form-sent">
        <div className="text-5xl">✅</div>
        <p className="text-lg font-bold">{pickName(form.successText, lang) || t('f_sent')}</p>
        <Button block onClick={() => { toast(t('f_sent')); onClose(); }}>{t('f_close')}</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {pickName(form.description, lang) ? <p className="text-sm text-slate-600">{pickName(form.description, lang)}</p> : null}
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('f_name')} *</span><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
      <label className="block"><span className="mb-1 block text-sm font-semibold">{t('f_phone')} *</span><Input value={phone} inputMode="numeric" onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
      {form.fields.map((f) => (
        <div key={f.id}><span className="mb-1 block text-sm font-semibold">{pickName(f.label, lang)}{f.required ? ' *' : ''}</span>
          <FieldInput f={f} value={vals[f.id] ?? ''} onChange={(v) => setVals({ ...vals, [f.id]: v })} /></div>
      ))}
      {err ? <p className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700" data-testid="form-err">{err}</p> : null}
      <p className="text-xs text-slate-500">{t('f_privacy')}</p>
      <Button block size="lg" loading={busy} onClick={send}>{t('f_send')}</Button>
    </div>
  );
}

export function FormHost() {
  const id = useOpenId();
  const { lang } = useLang();
  const { data } = useLive(() => api.listForms(), []);
  const form = id ? (data ?? []).find((f) => f.id === id) : undefined;
  return (
    <Modal open={!!form} onClose={closeForm} title={form ? (form.emoji || '💬') + ' ' + pickName(form.title, lang) : ''}>
      {form ? <FormBody key={form.id} form={form} onClose={closeForm} /> : null}
    </Modal>
  );
}
