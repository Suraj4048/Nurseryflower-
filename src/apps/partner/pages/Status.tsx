import { Link, Navigate } from 'react-router-dom';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, Spinner, StatusBadge, toastErr } from '../../../components/ui';
import { fmtDate } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import { PARTNER_TYPE_EMOJI } from '../../../lib/types';

export default function Status({ onLogout }: { onLogout: () => void }) {
  const { t } = useLang();
  const { data, loading } = useLive(() => api.myApplication(), []);
  if (loading) return <Spinner />;
  if (!data) return <Navigate to="/join" replace />;
  const a = data;
  const editable = a.status === 'draft' || a.status === 'need_more_info';
  return (
    <div className="space-y-4 p-5">
      <h1 className="text-2xl font-extrabold">{t('app_status_title')}</h1>
      <Card className="space-y-2">
        <div className="text-lg font-bold">{PARTNER_TYPE_EMOJI[a.partnerType]} {a.shopName || '-'}</div>
        <StatusBadge status={a.status} label={t('app_' + a.status)} />
        {a.submittedAt ? <div className="text-sm text-slate-500">{fmtDate(a.submittedAt)}</div> : null}
        {a.status === 'submitted' || a.status === 'under_review' ? <p className="text-sm text-slate-600">{t('sla_note')}</p> : null}
        {a.reviewNote && a.status === 'need_more_info' ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><b>{t('admin_note')}:</b> {a.reviewNote}</p> : null}
        {a.rejectReason ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><b>{t('reason')}:</b> {a.rejectReason}</p> : null}
        {a.status === 'approved' ? <p className="rounded-lg bg-leaf-50 p-3 text-leaf-800">{t('approved_msg')}</p> : null}
      </Card>
      {editable ? <Link to="/join"><Button block size="lg">{a.status === 'draft' ? t('next') : t('resubmit')}</Button></Link> : null}
      {a.status === 'rejected' ? <Link to="/join"><Button block variant="secondary">{t('resubmit')}</Button></Link> : null}
      <Button block variant="ghost" onClick={() => api.logout().then(onLogout).catch(toastErr)}>{t('logout')}</Button>
    </div>
  );
}
