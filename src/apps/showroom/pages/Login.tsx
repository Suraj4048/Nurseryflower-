import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Button, Field, Input, toast, toastErr } from '../../../components/ui';
import { config } from '../../../config';
import { otpIdentifierKind } from '../../../integrations/otp';
import { isPhone } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import { useUser } from '../ctx';

export default function Login() {
  const { t } = useLang();
  const nav = useNavigate();
  const loc = useLocation();
  const { refresh } = useUser();
  const kind = otpIdentifierKind();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const back = (loc.state as { from?: string } | null)?.from ?? '/';

  const send = async () => {
    if (kind === 'phone' && !isPhone(id)) return toast(t('invalid_phone'), 'err');
    setBusy(true);
    try { const r = await api.customerSendCode(id); setHint(r.hint ?? ''); setSent(true); toast(t('otp_sent')); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true);
    try { await api.customerVerifyCode(id, code, name); await refresh(); nav(back, { replace: true }); } catch (e) { toastErr(e); }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-sm space-y-4 p-5">
      <div className="text-center"><div className="text-5xl">🌿</div><h2 className="mt-1 text-2xl font-extrabold">{t('login_title')}</h2></div>
      {!sent ? (
        <>
          <Field label={kind === 'phone' ? t('phone') : t('email')}>
            <Input value={id} onChange={(e) => setId(e.target.value)} inputMode={kind === 'phone' ? 'numeric' : 'email'} placeholder={kind === 'phone' ? '98XXXXXXXX' : 'you@email.com'} />
          </Field>
          <Field label={t('your_name_optional')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button block size="lg" loading={busy} onClick={send}>{t('send_otp')}</Button>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-slate-600">{id}</p>
          <Field label={t('enter_otp')}><Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={8} className="text-center text-2xl tracking-widest" /></Field>
          {config.mode === 'demo' ? <p className="rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-800">{t('demo_otp')} {hint ? '(' + hint + ')' : ''}</p> : null}
          <Button block size="lg" loading={busy} onClick={verify}>{t('verify')}</Button>
          <Button block variant="ghost" onClick={() => { setSent(false); setCode(''); }}>{t('change_number')}</Button>
        </>
      )}
    </div>
  );
}
