import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, Field, Input, Spinner, toast, toastErr } from '../../../components/ui';
import { getMyLocation } from '../../../lib/geo';
import { compressImage } from '../../../lib/image';
import { useLang } from '../../../lib/i18n';
import { isPhone } from '../../../lib/format';
import { PARTNER_TYPES, PARTNER_TYPE_EMOJI, type Application, type DocFile, type DocType, type PartnerType, type Rule } from '../../../lib/types';

const STEPS = ['step_type', 'step_details', 'step_docs', 'step_review'] as const;

function DocPick({ type, label, doc, onFile }: { type: DocType; label: string; doc?: DocFile; onFile: (f: File, t: DocType) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { t } = useLang();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
      {doc?.thumb ? <img src={doc.thumb} alt="" className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-2xl">📷</div>}
      <div className="min-w-0 flex-1"><div className="font-semibold">{label}</div>{doc ? <div className="text-xs text-leaf-700">✓ {t('photo_added')}</div> : null}</div>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, type); e.currentTarget.value = ''; }} />
      <Button size="sm" variant={doc ? 'secondary' : 'primary'} onClick={() => ref.current?.click()}>{t('take_photo')}</Button>
    </div>
  );
}

export default function Join() {
  const { t } = useLang();
  const nav = useNavigate();
  const rules = useLive(() => api.listRules(), []);
  const existing = useLive(() => api.myApplication(), []);
  const [step, setStep] = useState(0);
  const [app, setApp] = useState<Application | null>(null);
  const [type, setType] = useState<PartnerType>('at_home');
  const [idType, setIdType] = useState<DocType>('aadhaar_masked');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (existing.data && !app) { setApp(existing.data); setType(existing.data.partnerType); setConsent(!!existing.data.consentAt); }
  }, [existing.data, app]);

  if (rules.loading || existing.loading) return <Spinner />;
  const rule: Rule | undefined = rules.data?.find((r) => r.partnerType === type);
  if (!rule) return <Spinner />;
  const cur: Application = app ?? {
    id: '', applicantId: '', partnerType: type, shopName: '', brandSuggestion: '', ownerName: '', phone: '', whatsapp: '', address: '', city: 'Lucknow', pincode: '',
    language: 'hi', upiId: '', gstin: '', licenceNo: '', licenceExpiry: '', docs: [], status: 'draft', checklist: {}, createdAt: Date.now(),
  };
  const set = (p: Partial<Application>) => setApp({ ...cur, ...p });
  const locked = cur.status !== 'draft' && cur.status !== 'need_more_info' && cur.id !== '';
  const idDoc = cur.docs.find((d) => rule.allowedIdDocs.includes(d.type));
  const docOf = (ty: DocType) => cur.docs.find((d) => d.type === ty);

  const addDoc = async (f: File, ty: DocType) => {
    try {
      const thumb = await compressImage(f, 700, 0.6);
      let gps: DocFile['gps'];
      try { gps = await getMyLocation(); } catch { /* optional */ }
      const isId = rule.allowedIdDocs.includes(ty);
      const kept = cur.docs.filter((d) => (isId ? !rule.allowedIdDocs.includes(d.type) : d.type !== ty));
      set({ docs: [...kept, { type: ty, name: f.name, thumb, takenAt: Date.now(), gps }] });
    } catch (e) { toastErr(e); }
  };

  const save = async (extra: Partial<Application> = {}) => {
    const saved = await api.saveApplication({ ...cur, ...extra, partnerType: type });
    setApp(saved); return saved;
  };
  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        if (!cur.shopName.trim() || !cur.ownerName.trim() || !isPhone(cur.phone) || cur.address.trim().length < 6) { toast(t('missing_fields'), 'err'); setBusy(false); return; }
        if (rule.gstRequired && cur.gstin.trim().length < 10) { toast(t('gst_needed'), 'err'); setBusy(false); return; }
        if (rule.licenceRequired && !cur.licenceNo.trim()) { toast(t('licence_needed'), 'err'); setBusy(false); return; }
      }
      if (step === 2) {
        const missing = rule.requiredDocs.filter((d) => !docOf(d));
        if (!idDoc || missing.length) { toast(t('select_photo_first'), 'err'); setBusy(false); return; }
      }
      await save();
      setStep(step + 1);
    } catch (e) { toastErr(e); }
    setBusy(false);
  };
  const submit = async () => {
    if (!consent) return toast(t('missing_fields'), 'err');
    setBusy(true);
    try { await save({ consentAt: cur.consentAt ?? Date.now() }); await api.submitApplication(); nav('/', { replace: true }); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  const gps = async () => { try { const p = await getMyLocation(); set({ lat: p.lat, lng: p.lng }); toast(t('location_saved')); } catch (e) { toastErr(e); } };

  return (
    <div className="space-y-4 p-5 pb-10">
      <h1 className="text-2xl font-extrabold">{t('join_title')}</h1>
      <div className="flex gap-1">{STEPS.map((s, i) => <div key={s} className={'h-2 flex-1 rounded-full ' + (i <= step ? 'bg-leaf-600' : 'bg-slate-200')} />)}</div>
      <div className="text-sm font-semibold text-slate-600">{step + 1}/4 · {t(STEPS[step])}</div>

      {step === 0 ? (
        <div className="space-y-3">
          <p className="text-lg font-bold">{t('choose_type')}</p>
          {PARTNER_TYPES.map((p) => (
            <button key={p} disabled={locked} onClick={() => { setType(p); set({ partnerType: p, docs: [] }); }}
              className={'flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left ' + (type === p ? 'border-leaf-600 bg-leaf-50' : 'border-slate-200')}>
              <span className="text-4xl">{PARTNER_TYPE_EMOJI[p]}</span>
              <span><span className="block text-xl font-bold">{t('type_' + p)}</span><span className="text-sm text-slate-500">{t('type_' + p + '_docs')}</span></span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <Field label={t('shop_name')}><Input value={cur.shopName} onChange={(e) => set({ shopName: e.target.value })} /></Field>
          <Field label={t('brand_suggestion')}><Input value={cur.brandSuggestion} onChange={(e) => set({ brandSuggestion: e.target.value })} /></Field>
          <Field label={t('owner_name')}><Input value={cur.ownerName} onChange={(e) => set({ ownerName: e.target.value })} /></Field>
          <Field label={t('phone')}><Input value={cur.phone} inputMode="numeric" maxLength={10} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label={t('whatsapp')}><Input value={cur.whatsapp} inputMode="numeric" maxLength={10} onChange={(e) => set({ whatsapp: e.target.value })} /></Field>
          <Field label={t('address')}><Input value={cur.address} onChange={(e) => set({ address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('city')}><Input value={cur.city} onChange={(e) => set({ city: e.target.value })} /></Field>
            <Field label={t('pincode')}><Input value={cur.pincode} inputMode="numeric" maxLength={6} onChange={(e) => set({ pincode: e.target.value })} /></Field>
          </div>
          <Button variant="secondary" onClick={gps}>📍 {t('use_gps')} {cur.lat ? '✓' : ''}</Button>
          <Field label={t('upi_id')}><Input value={cur.upiId} onChange={(e) => set({ upiId: e.target.value })} placeholder="name@upi" /></Field>
          {rule.gstRequired ? <Field label={t('gst_no')}><Input value={cur.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} maxLength={15} /></Field> : null}
          {rule.licenceRequired ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('licence_no')}><Input value={cur.licenceNo} onChange={(e) => set({ licenceNo: e.target.value })} /></Field>
              <Field label={t('licence_expiry')}><Input type="date" value={cur.licenceExpiry} onChange={(e) => set({ licenceExpiry: e.target.value })} /></Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <Card className="space-y-2">
            <div className="font-bold">{t('choose_id')} <span className="text-xs font-normal text-slate-500">({t('id_one')})</span></div>
            <div className="grid grid-cols-2 gap-2">
              {rule.allowedIdDocs.map((d) => <button key={d} onClick={() => setIdType(d)} className={'rounded-lg border px-2 py-2 text-sm font-semibold ' + (idType === d ? 'border-leaf-600 bg-leaf-50' : 'border-slate-200')}>{t('id_' + d)}</button>)}
            </div>
            {idType === 'aadhaar_masked' ? <p className="text-xs text-amber-800">{t('aadhaar_hint')}</p> : null}
            <DocPick type={idType} label={t('id_' + idType)} doc={idDoc?.type === idType ? idDoc : undefined} onFile={addDoc} />
            {idDoc && idDoc.type !== idType ? <div className="text-xs text-leaf-700">✓ {t('id_' + idDoc.type)}</div> : null}
          </Card>
          {rule.requiredDocs.map((d) => <DocPick key={d} type={d} label={t('doc_' + d)} doc={docOf(d)} onFile={addDoc} />)}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <Card className="space-y-1 text-sm">
            <div className="text-lg font-bold">{PARTNER_TYPE_EMOJI[type]} {cur.shopName}</div>
            <div>{cur.ownerName} · {cur.phone}</div><div>{cur.address}, {cur.city} {cur.pincode}</div>
            <div className="text-leaf-700">{cur.docs.length} 📷</div>
          </Card>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t('consent_text')}</span>
          </label>
          <Button block size="xl" loading={busy} onClick={submit}>{t('submit')}</Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        {step > 0 ? <Button variant="secondary" size="lg" onClick={() => setStep(step - 1)}>{t('back')}</Button> : null}
        {step < 3 ? <Button className="flex-1" size="lg" loading={busy} disabled={locked} onClick={next}>{t('next')}</Button> : null}
      </div>
    </div>
  );
}
