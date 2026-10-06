import { useRef, useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Empty, Field, Input, Modal, PhotoThumb, Select, Spinner, TextArea, toast, toastErr } from '../../../components/ui';
import { compressImage } from '../../../lib/image';
import { pickName, useLang } from '../../../lib/i18n';
import { rupees } from '../../../lib/format';
import { CATEGORIES, CATEGORY_EMOJI, type Category } from '../../../lib/types';

export default function Listings() {
  const { t, lang } = useLang();
  const plants = useLive(() => api.myPlants(), []);
  const rule = useLive(() => api.myRule(), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cat, setCat] = useState<Category>('indoor');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [care, setCare] = useState('');
  const [img, setImg] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  if (plants.loading) return <Spinner />;
  const cats = rule.data?.allowedCategories ?? CATEGORIES;

  const setStk = async (id: string, v: number) => { try { await api.setStock(id, Math.max(0, v)); await plants.reload(); } catch (e) { toastErr(e); } };
  const add = async () => {
    const p = Number(price); const s = Number(stock);
    if (!name.trim() || !(p > 0) || !(s >= 0)) return toast(t('missing_fields'), 'err');
    setBusy(true);
    try {
      await api.addMyPlant({ name: { en: name.trim(), [lang]: name.trim() }, category: cat, price: p, stock: s, image: img || CATEGORY_EMOJI[cat], care });
      toast(t('add_product_note')); setOpen(false); setName(''); setPrice(''); setCare(''); setImg(''); await plants.reload();
    } catch (e) { toastErr(e); }
    setBusy(false);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">🪴 {t('my_listings')}</h1><Button onClick={() => { setCat(cats[0]); setOpen(true); }}>＋ {t('add_product')}</Button></div>
      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{t('add_product_note')}</p>
      {(plants.data ?? []).length === 0 ? <Empty text={t('no_products')} /> : null}
      {(plants.data ?? []).map((p) => (
        <Card key={p.id} className="flex gap-3">
          <PhotoThumb src={p.image} className="h-20 w-20 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold">{pickName(p.name, lang)}</div>
            <div className="flex items-center gap-2 text-sm"><b>{rupees(p.price)}</b>
              <Badge tone={p.status === 'live' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>{p.status === 'live' ? t('live') : p.status === 'pending' ? t('pending') : t('rejected')}</Badge></div>
            {p.rejectReason ? <div className="text-xs text-red-700">{p.rejectReason}</div> : null}
            <div className="mt-2 flex items-center gap-2">
              <button className="h-9 w-9 rounded-lg border text-xl" onClick={() => setStk(p.id, p.stock - 1)}>−</button>
              <span className={'w-10 text-center text-lg font-bold ' + (p.stock === 0 ? 'text-red-600' : '')}>{p.stock}</span>
              <button className="h-9 w-9 rounded-lg border text-xl" onClick={() => setStk(p.id, p.stock + 1)}>+</button>
              <button className={'ml-auto rounded-lg px-3 py-2 text-sm font-bold ' + (p.stock > 0 ? 'bg-red-100 text-red-700' : 'bg-leaf-100 text-leaf-800')} onClick={() => setStk(p.id, p.stock > 0 ? 0 : 10)}>
                {p.stock > 0 ? t('stock_off') : t('stock_on')}</button>
            </div>
          </div>
        </Card>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title={t('add_product')}>
        <div className="space-y-3">
          <Field label={t('product_name')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t('category')}><Select value={cat} onChange={(e) => setCat(e.target.value as Category)}>{cats.map((c) => <option key={c} value={c}>{t('cat_' + c)}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('price_rs')}><Input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label={t('stock_qty')}><Input value={stock} inputMode="numeric" onChange={(e) => setStock(e.target.value)} /></Field>
          </div>
          <Field label={t('care_tips_opt')}><TextArea rows={2} value={care} onChange={(e) => setCare(e.target.value)} /></Field>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { setImg(await compressImage(f, 600, 0.6)); } catch (er) { toastErr(er); } } }} />
          <div className="flex items-center gap-3">{img ? <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" /> : null}<Button variant="secondary" onClick={() => fileRef.current?.click()}>📷 {t('upload_photo')}</Button></div>
          <Button block size="lg" loading={busy} onClick={add}>{t('submit')}</Button>
        </div>
      </Modal>
    </div>
  );
}
