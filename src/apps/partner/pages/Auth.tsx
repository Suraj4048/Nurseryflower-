import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../api';
import { Button, Field, Input, toast, toastErr } from '../../../components/ui';
import { isPhone } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import { config } from '../../../config';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 p-6">
      <div className="mt-4 text-center"><div className="text-6xl">🌳</div><h1 className="text-2xl font-extrabold text-leaf-800">Nurserylelo Godown</h1><p className="text-lg font-bold">{title}</p></div>
      {children}
    </div>
  );
}

export function Login({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!isPhone(phone)) return toast(t('invalid_phone'), 'err');
    setBusy(true);
    try { await api.partnerLogin(phone, pin); onDone(); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  return (
    <Frame title={t('partner_login')}>
      <Field label={t('phone')}><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={10} className="text-xl" /></Field>
      <Field label={t('pin')}><Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} className="text-xl" /></Field>
      <Button block size="xl" loading={busy} onClick={go}>{t('login')}</Button>
      <Link to="/register" className="block"><Button block size="lg" variant="amber">{t('new_partner')}</Button></Link>
      {config.mode === 'demo' ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Demo: 9000000001 / PIN 1234 (nursery). Naya applicant: 9000000010 / 1234.</p> : null}
    </Frame>
  );
}

export function Register({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!isPhone(phone)) return toast(t('invalid_phone'), 'err');
    if (!/^\d{4,6}$/.test(pin)) return toast(t('pin_wrong'), 'err');
    setBusy(true);
    try { await api.partnerRegister(phone, pin, name); onDone(); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  return (
    <Frame title={t('join_title')}>
      <p className="text-center text-sm text-slate-600">{t('join_sub')}</p>
      <Field label={t('name')}><Input value={name} onChange={(e) => setName(e.target.value)} className="text-xl" /></Field>
      <Field label={t('phone')}><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" maxLength={10} className="text-xl" /></Field>
      <Field label={t('create_pin')}><Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} className="text-xl" /></Field>
      <Button block size="xl" loading={busy} onClick={go}>{t('register_account')}</Button>
      <Link to="/login" className="block text-center font-semibold text-leaf-700">{t('have_account')}</Link>
    </Frame>
  );
}
