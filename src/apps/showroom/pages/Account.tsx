import { useNavigate } from 'react-router-dom';
import { api } from '../../../api';
import { Button, Card, LangGrid, toastErr } from '../../../components/ui';
import { config } from '../../../config';
import { useLang } from '../../../lib/i18n';
import { useUser } from '../ctx';

export default function Account() {
  const { t } = useLang();
  const nav = useNavigate();
  const { user, refresh } = useUser();
  const logout = async () => { try { await api.logout(); await refresh(); } catch (e) { toastErr(e); } };
  return (
    <div className="space-y-3 p-3">
      <h2 className="text-xl font-extrabold">👤 {t('account')}</h2>
      {user ? (
        <Card className="flex items-center justify-between">
          <div><div className="font-bold">{t('hello_user', { name: user.name })}</div><div className="text-sm text-slate-500">{user.phone ?? user.email}</div></div>
          <Button variant="ghost" size="sm" onClick={logout}>{t('logout')}</Button>
        </Card>
      ) : <Button block size="lg" onClick={() => nav('/login')}>{t('login')}</Button>}
      <button onClick={() => nav('/bookings')} className="block w-full rounded-2xl border border-leaf-200 bg-leaf-50 p-4 text-center font-bold text-leaf-800" data-testid="acc-bookings">📅 {t('bk_my')}</button>
      <a href="/partner/#/join" className="block rounded-2xl bg-leaf-700 p-4 text-center font-bold text-white">🌳 {t('become_partner')}</a>
      <Card><div className="mb-2 font-bold">🌐 {t('language_change')}</div><LangGrid /></Card>
      <a className="block rounded-2xl border border-slate-200 p-4 text-center font-semibold" href={`https://wa.me/${config.supportWhatsApp}`} target="_blank" rel="noreferrer">💬 {t('support')}</a>
      <a className="block text-center text-sm text-slate-500" href={`https://wa.me/?text=${encodeURIComponent(t('share_text') + ' ' + location.origin)}`} target="_blank" rel="noreferrer">{t('share_whatsapp')}</a>
    </div>
  );
}
