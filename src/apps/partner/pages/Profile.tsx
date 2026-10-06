import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Button, Card, Input, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { useLang } from '../../../lib/i18n';

export default function Profile() {
  const { t } = useLang();
  const { data: n, loading, reload } = useLive(() => api.myNursery(), []);
  const [price, setPrice] = useState('');
  const [radius, setRadius] = useState('');
  const [bio, setBio] = useState('');
  const [blocked, setBlocked] = useState<string[]>([]);
  const [newDate, setNewDate] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (n && !ready) { setPrice(String(n.startingPrice ?? '')); setRadius(String(n.serviceRadiusKm ?? '')); setBio(n.bio ?? ''); setBlocked(n.blockedDates ?? []); setReady(true); }
  }, [n, ready]);
  if (loading) return <Spinner />;
  const save = async () => {
    try {
      await api.updateMyProfile({ startingPrice: Number(price) || 0, serviceRadiusKm: Number(radius) || 0, bio, blockedDates: blocked });
      toast(t('pf_saved')); await reload();
    } catch (e) { toastErr(e); }
  };
  return (
    <div className="space-y-3 p-4">
      <h1 className="text-2xl font-extrabold">🙋 {t('profile')}</h1>
      <Card className="space-y-3">
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t('pf_price')}</span><Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} data-testid="pf-price" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t('pf_radius')}</span><Input inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value)} data-testid="pf-radius" /></label>
        <label className="block"><span className="mb-1 block text-sm font-semibold">{t('pf_bio')}</span><TextArea rows={3} maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} data-testid="pf-bio" /></label>
        <div>
          <span className="mb-1 block text-sm font-semibold">{t('pf_blocked')}</span>
          <div className="flex gap-2"><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} data-testid="pf-date" />
            <Button variant="secondary" onClick={() => { if (newDate && !blocked.includes(newDate)) setBlocked([...blocked, newDate].sort()); setNewDate(''); }} data-testid="pf-adddate">+</Button></div>
          <div className="mt-2 flex flex-wrap gap-2">{blocked.map((d) => <span key={d} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{d} <button onClick={() => setBlocked(blocked.filter((x) => x !== d))} className="ml-1 text-red-600">✕</button></span>)}</div>
        </div>
        <Button block size="lg" onClick={save} data-testid="pf-save">{t('pf_save')}</Button>
      </Card>
    </div>
  );
}
