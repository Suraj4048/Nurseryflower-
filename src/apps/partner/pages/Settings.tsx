import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, LangGrid, Spinner, toastErr } from '../../../components/ui';
import { useLang } from '../../../lib/i18n';

export default function Settings({ onLogout }: { onLogout: () => void }) {
  const { t } = useLang();
  const { data: n, loading } = useLive(() => api.myNursery(), []);
  if (loading) return <Spinner />;
  return (
    <div className="space-y-3 p-4">
      <h1 className="text-2xl font-extrabold">⚙️ {t('settings')}</h1>
      {n ? (
        <Card className="space-y-1">
          <div className="text-sm text-slate-500">{t('brand_shown')}</div><div className="text-xl font-bold">{n.brandName}</div>
          <div className="text-sm">{t('unique_id')}: <b>{n.uniqueId}</b></div>
          <div className="text-sm">{t('tier')}: <b>{t('tier_' + n.tier)}</b></div>
          {n.probationEndsOn ? <div className="text-sm text-amber-800">{t('probation', { date: n.probationEndsOn })}</div> : null}
        </Card>
      ) : null}
      <Card><div className="mb-2 font-bold">🌐 {t('language')}</div><LangGrid onPick={(c) => { void api.setLanguage(c); }} /></Card>
      <Button block variant="secondary" size="lg" onClick={() => api.logout().then(onLogout).catch(toastErr)}>{t('logout')}</Button>
    </div>
  );
}
