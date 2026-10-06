import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, toastErr } from '../../../components/ui';
import { identifyPlant, type IdentifyResult } from '../../../integrations/ai';
import { compressImage } from '../../../lib/image';
import { useLang } from '../../../lib/i18n';

export default function Identify() {
  const { t } = useLang();
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState('');
  const [res, setRes] = useState<IdentifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true); setRes(null);
    try { const d = await compressImage(f, 800, 0.7); setImg(d); setRes(await identifyPlant(d)); } catch (e) { toastErr(e); }
    setBusy(false);
  };
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-xl font-extrabold">📷 {t('identify_plant')}</h2>
      <p className="text-sm text-slate-600">{t('identify_hint')}</p>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <Button size="lg" block loading={busy} onClick={() => ref.current?.click()}>{t('pick_photo')}</Button>
      {img ? <img src={img} alt="" className="max-h-72 w-full rounded-2xl object-cover" /> : null}
      {res ? (
        <div className="space-y-2">
          <div className="font-bold">{t('identify_result')}:</div>
          {res.suggestions.map((s) => (
            <Card key={s.name}>
              <div className="flex justify-between"><b>{s.name}</b><span className="text-sm text-leaf-700">{Math.round(s.confidence * 100)}%</span></div>
              <p className="text-sm text-slate-600">{s.care}</p>
            </Card>
          ))}
          {res.demo ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{t('ai_demo')}</p> : null}
          <Link to="/"><Button variant="secondary" block>{t('find_in_shop')}</Button></Link>
        </div>
      ) : null}
    </div>
  );
}
