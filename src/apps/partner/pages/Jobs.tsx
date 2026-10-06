import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Empty, PhotoThumb, Spinner, toast, toastErr } from '../../../components/ui';
import { rupees } from '../../../lib/format';
import { useLang } from '../../../lib/i18n';
import type { ProviderJob } from '../../../lib/types';

function JobCard({ j, reload }: { j: ProviderJob; reload: () => Promise<void> }) {
  const { t } = useLang();
  const go = async (a: 'accept' | 'decline' | 'done', ok: string) => { try { await api.respondJob(j.id, a); toast(ok); await reload(); } catch (e) { toastErr(e); } };
  const closed = j.status === 'cancelled' || j.status === 'done';
  return (
    <Card className="space-y-1" >
      <div className="flex items-center justify-between"><span className="text-lg font-extrabold" data-testid="job-title">#{j.shortId} · {j.serviceName}</span>
        <Badge tone={j.status === 'cancelled' ? 'red' : j.status === 'done' ? 'green' : j.providerState === 'accepted' ? 'blue' : 'amber'}>{j.status === 'cancelled' ? t('bkst_cancelled') : j.status === 'done' ? t('bkst_done') : t('job_' + j.providerState)}</Badge></div>
      <div className="text-base">📅 <b>{j.date}</b>{j.time ? ' · ' + j.time : ''}</div>
      <div className="text-base">📍 {j.venue}{j.pincode ? ' - ' + j.pincode : ''}</div>
      {j.remarks ? <div className="text-sm text-slate-600">📝 {j.remarks}</div> : null}
      {j.photo ? <PhotoThumb src={j.photo} className="h-24 w-24 rounded-lg" /> : null}
      <div className="text-sm">{t('job_amount')}: <b>{j.amount ? rupees(j.amount) : t('job_amount_tbd')}</b> · {j.tokenPaid ? '✅ ' + t('job_token_paid') : '⏳ ' + t('job_token_wait')}</div>
      <p className="text-[11px] text-slate-400">🔒 {t('job_privacy')}</p>
      {!closed ? (
        <div className="flex gap-2 pt-1">
          {j.providerState === 'assigned' ? <Button className="flex-1" onClick={() => go('accept', t('job_accepted'))} data-testid="job-accept">✅ {t('job_accept')}</Button> : null}
          {j.providerState === 'accepted' && j.tokenPaid ? <Button className="flex-1" onClick={() => go('done', t('job_done_ok'))} data-testid="job-done">🏁 {t('job_mark_done')}</Button> : null}
          <Button variant="danger" onClick={() => { if (confirm(t('job_decline_confirm'))) void go('decline', t('job_declined')); }} data-testid="job-decline">❌ {t('job_decline')}</Button>
        </div>
      ) : null}
    </Card>
  );
}

export default function Jobs() {
  const { t } = useLang();
  const nursery = useLive(() => api.myNursery(), []);
  const jobs = useLive(() => api.myJobs(), []);
  if (nursery.loading || jobs.loading) return <Spinner />;
  const n = nursery.data;
  const list = [...(jobs.data ?? [])].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const act = list.filter((j) => !['done', 'cancelled'].includes(j.status));
  const old = list.filter((j) => ['done', 'cancelled'].includes(j.status));
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">🧰 {t('jobs')}</h1>
        {n ? (
          <button onClick={async () => { try { await api.setShopOpen(!n.isOpen); await nursery.reload(); } catch (e) { toastErr(e); } }} data-testid="avail-toggle"
            className={'rounded-full px-4 py-2 text-sm font-extrabold ' + (n.isOpen ? 'bg-leaf-600 text-white' : 'bg-slate-200 text-slate-700')}>{n.isOpen ? '🟢 ' + t('job_available') : '⚪ ' + t('job_unavailable')}</button>
        ) : null}
      </div>
      {act.length === 0 ? <Empty text={t('job_none')} emoji="🧰" /> : act.map((j) => <JobCard key={j.id} j={j} reload={jobs.reload} />)}
      {old.length ? <div className="pt-2 text-sm font-bold text-slate-500">{t('job_history')}</div> : null}
      {old.map((j) => <JobCard key={j.id} j={j} reload={jobs.reload} />)}
    </div>
  );
}
