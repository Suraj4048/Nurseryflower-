import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Card, Spinner } from '../../../components/ui';
import { rupees } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';

export default function Earnings() {
  const { t } = useLang();
  const { data, loading } = useLive(() => api.earnings(), []);
  if (loading || !data) return <Spinner />;
  const box = (label: string, v: number, cls: string) => <Card className={cls}><div className="text-sm text-slate-600">{label}</div><div className="text-3xl font-black">{rupees(v)}</div></Card>;
  return (
    <div className="space-y-3 p-4">
      <h1 className="text-2xl font-extrabold">💰 {t('earnings')}</h1>
      {box(t('earnings_today'), data.today, 'bg-leaf-50')}
      {box(t('earnings_month'), data.month, 'bg-sky-50')}
      {box(t('earnings_pending'), data.pending, 'bg-amber-50')}
      <Card><div className="text-sm text-slate-600">{t('orders_today')}</div><div className="text-3xl font-black">{data.deliveredCount}</div></Card>
      <p className="text-xs text-slate-500">{t('payout_note')} {data.holdNote ?? ''}</p>
    </div>
  );
}
