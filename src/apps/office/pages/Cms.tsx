import { useRef, useState } from 'react';
import { api } from '../../../api';
import { useLive } from '../../../components/hooks';
import { Badge, Button, Card, Field, Input, Modal, Select, Spinner, toast, toastErr } from '../../../components/ui';
import { compressToMaxKB } from '../../../lib/image';
import type { ActionType, CategoryDef, Slide, SlideButton, Slideshow } from '../../../lib/types';

const ACTIONS: ActionType[] = ['call', 'whatsapp', 'link', 'category', 'product', 'search', 'form', 'service'];
const ACTION_HELP: Record<ActionType, string> = {
  call: 'Phone number (9198...)', whatsapp: 'WhatsApp number', link: 'https://... ya /cart jaisa path', category: 'Category key (jaise indoor)', product: 'Product id', search: 'Search word (jaise Tulsi)', form: 'Form id (Office > Forms me dikhti hai)', service: 'Service key: gardener, decor ya bulk',
};

// ---------------- Categories ----------------
export function Categories() {
  const { data, loading, reload } = useLive(() => api.adminAllCategories(), []);
  const [edit, setEdit] = useState<CategoryDef | null>(null);
  const [isNew, setIsNew] = useState(false);
  if (loading) return <Spinner />;
  const list = [...(data ?? [])].sort((a, b) => a.order - b.order);
  const save = async () => {
    if (!edit) return;
    if (!edit.key.trim() || !edit.name.en?.trim()) return toast('Key aur English naam bharo', 'err');
    try {
      await api.adminSaveCategory({ ...edit, key: edit.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') });
      toast('Category save ho gayi'); setEdit(null); await reload();
    } catch (e) { toastErr(e); }
  };
  const del = async (c: CategoryDef) => { if (!confirm(c.name.en + ' hatayein?')) return; try { await api.adminDeleteCategory(c.key); await reload(); } catch (e) { toastErr(e); } };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Categories</h1>
        <Button onClick={() => { setIsNew(true); setEdit({ key: '', name: { en: '', hi: '' }, emoji: '🌱', active: true, order: list.length + 1 }); }}>＋ Nayi category</Button></div>
      <p className="text-xs text-slate-500">Yaha se showroom ki categories badlo. Ek product kai categories me ho sakta hai.</p>
      {list.map((c) => (
        <Card key={c.key} className="flex items-center gap-3">
          <span className="text-3xl">{c.emoji}</span>
          <div className="min-w-0 flex-1"><div className="font-bold">{c.name.en} {c.name.hi ? <span className="text-slate-500">· {c.name.hi}</span> : null}</div><div className="font-mono text-xs text-slate-500">{c.key} · order {c.order}</div></div>
          <Badge tone={c.active ? 'green' : 'gray'}>{c.active ? 'active' : 'hidden'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => { setIsNew(false); setEdit(c); }}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => del(c)}>Delete</Button>
        </Card>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={isNew ? 'Nayi category' : 'Category edit'}>
        {edit ? (
          <div className="space-y-2">
            <Field label="Key (sirf a-z, 0-9, _)" hint={isNew ? '' : 'Key badal nahi sakte'}><Input value={edit.key} disabled={!isNew} onChange={(e) => setEdit({ ...edit, key: e.target.value })} /></Field>
            <Field label="Naam (English)"><Input value={edit.name.en ?? ''} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></Field>
            <Field label="Naam (Hindi)"><Input value={edit.name.hi ?? ''} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, hi: e.target.value } })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Emoji"><Input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} /></Field>
              <Field label="Order"><Input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />Showroom me dikhao</label>
            <Button block onClick={save}>Save</Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

// ---------------- Slideshows ----------------
const newSlide = (): Slide => ({ id: 's' + Date.now().toString(36), image: '', bg: '#16a34a,#4ade80', emoji: '🌿', ribbon: '', title: { en: '', hi: '' }, subtitle: { en: '', hi: '' }, buttons: [] });

function SlideEditor({ s, onChange, onDelete }: { s: Slide; onChange: (s: Slide) => void; onDelete: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const setBtn = (i: number, b: SlideButton) => onChange({ ...s, buttons: s.buttons.map((x, j) => (j === i ? b : x)) });
  const [c1, c2] = s.bg.split(',');
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-3">
        {s.image ? <img src={s.image} alt="" className="h-14 w-24 rounded-lg object-cover" /> : <div className="flex h-14 w-24 items-center justify-center rounded-lg text-3xl" style={{ background: `linear-gradient(90deg,${c1},${c2 ?? c1})` }}>{s.emoji}</div>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { const d = await compressToMaxKB(f, 100, 1000); onChange({ ...s, image: d }); toast('Photo 100 KB se chhoti kar di'); } catch (er) { toastErr(er); } } }} />
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>📷 Image</Button>
        {s.image ? <Button size="sm" variant="ghost" onClick={() => onChange({ ...s, image: '' })}>Image hatao</Button> : null}
        <Button size="sm" variant="danger" className="ml-auto" onClick={onDelete}>Slide delete</Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Emoji"><Input value={s.emoji} onChange={(e) => onChange({ ...s, emoji: e.target.value })} /></Field>
        <Field label="Rang 1,2 (#hex,#hex)"><Input value={s.bg} onChange={(e) => onChange({ ...s, bg: e.target.value })} /></Field>
        <Field label="Ribbon"><Input value={s.ribbon} placeholder="Hot Deals" onChange={(e) => onChange({ ...s, ribbon: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Title (English)"><Input value={s.title.en ?? ''} onChange={(e) => onChange({ ...s, title: { ...s.title, en: e.target.value } })} /></Field>
        <Field label="Title (Hindi)"><Input value={s.title.hi ?? ''} onChange={(e) => onChange({ ...s, title: { ...s.title, hi: e.target.value } })} /></Field>
        <Field label="Subtitle (English)"><Input value={s.subtitle.en ?? ''} onChange={(e) => onChange({ ...s, subtitle: { ...s.subtitle, en: e.target.value } })} /></Field>
        <Field label="Subtitle (Hindi)"><Input value={s.subtitle.hi ?? ''} onChange={(e) => onChange({ ...s, subtitle: { ...s.subtitle, hi: e.target.value } })} /></Field>
      </div>
      <div className="rounded-lg bg-slate-50 p-2">
        <div className="mb-1 text-xs font-bold text-slate-600">Poore slide par click karne par</div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={s.action?.type ?? ''} onChange={(e) => onChange({ ...s, action: e.target.value ? { type: e.target.value as ActionType, value: s.action?.value ?? '' } : undefined })}>
            <option value="">(kuch nahi)</option>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select>
          {s.action ? <Input placeholder={ACTION_HELP[s.action.type]} value={s.action.value} onChange={(e) => onChange({ ...s, action: { type: s.action!.type, value: e.target.value } })} /> : null}
        </div>
      </div>
      <div className="rounded-lg bg-slate-50 p-2">
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">Buttons <Button size="sm" variant="secondary" onClick={() => onChange({ ...s, buttons: [...s.buttons, { type: 'search', value: '', label: { en: 'Open', hi: 'खोलें' } }] })}>＋ Button</Button></div>
        {s.buttons.map((b, i) => (
          <div key={i} className="mb-1 grid grid-cols-12 gap-1">
            <Input className="col-span-3" placeholder="Label EN" value={b.label.en ?? ''} onChange={(e) => setBtn(i, { ...b, label: { ...b.label, en: e.target.value } })} />
            <Input className="col-span-3" placeholder="Label HI" value={b.label.hi ?? ''} onChange={(e) => setBtn(i, { ...b, label: { ...b.label, hi: e.target.value } })} />
            <Select className="col-span-2" value={b.type} onChange={(e) => setBtn(i, { ...b, type: e.target.value as ActionType })}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</Select>
            <Input className="col-span-3" placeholder={ACTION_HELP[b.type]} value={b.value} onChange={(e) => setBtn(i, { ...b, value: e.target.value })} />
            <button className="col-span-1 text-red-600" onClick={() => onChange({ ...s, buttons: s.buttons.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Slideshows() {
  const { data, loading, reload } = useLive(() => api.adminAllSlideshows(), []);
  const [edit, setEdit] = useState<Slideshow | null>(null);
  if (loading) return <Spinner />;
  const save = async () => {
    if (!edit) return;
    try { await api.adminSaveSlideshow(edit); toast('Slideshow save ho gaya'); setEdit(null); await reload(); } catch (e) { toastErr(e); }
  };
  const del = async (s: Slideshow) => { if (!confirm(s.name + ' hatayein?')) return; try { await api.adminDeleteSlideshow(s.id); await reload(); } catch (e) { toastErr(e); } };
  const upd = (s: Slide, i: number) => setEdit(edit && { ...edit, slides: edit.slides.map((x, j) => (j === i ? s : x)) });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h1 className="text-xl font-extrabold">Slideshows</h1>
        <Button onClick={() => setEdit({ id: 'ss' + Date.now().toString(36), name: 'Naya slideshow', placement: 'top', enabled: true, intervalSec: 4, border: true, transition: 'slide', height: 'md', slides: [newSlide()] })}>＋ Naya slideshow</Button></div>
      <p className="text-xs text-slate-500">Top = search bar ke neeche. Mid = home page ke beech. Image apne aap 100 KB se chhoti ho jati hai.</p>
      {(data ?? []).map((s) => (
        <Card key={s.id} className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><div className="font-bold">{s.name}</div><div className="text-xs text-slate-500">{s.placement === 'top' ? 'Search ke neeche' : 'Home ke beech'} · {s.slides.length} slides · {s.intervalSec}s · {s.transition}</div></div>
          <Badge tone={s.enabled ? 'green' : 'gray'}>{s.enabled ? 'on' : 'off'}</Badge>
          <Button size="sm" variant="secondary" onClick={() => setEdit(JSON.parse(JSON.stringify(s)) as Slideshow)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => del(s)}>Delete</Button>
        </Card>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Slideshow edit">
        {edit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Naam"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Jagah"><Select value={edit.placement} onChange={(e) => setEdit({ ...edit, placement: e.target.value as 'top' | 'mid' })}><option value="top">Search ke neeche</option><option value="mid">Home ke beech</option></Select></Field>
              <Field label="Slide badalne ka time (sec)"><Input type="number" value={edit.intervalSec} onChange={(e) => setEdit({ ...edit, intervalSec: Math.max(2, Number(e.target.value)) })} /></Field>
              <Field label="Transition"><Select value={edit.transition} onChange={(e) => setEdit({ ...edit, transition: e.target.value as 'slide' | 'fade' })}><option value="slide">Slide</option><option value="fade">Fade</option></Select></Field>
              <Field label="Height"><Select value={edit.height} onChange={(e) => setEdit({ ...edit, height: e.target.value as 'sm' | 'md' | 'lg' })}><option value="sm">Chhota</option><option value="md">Medium</option><option value="lg">Bada</option></Select></Field>
              <div className="flex flex-col justify-end gap-1 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={edit.border} onChange={(e) => setEdit({ ...edit, border: e.target.checked })} />Border</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} />Chalu (on)</label>
              </div>
            </div>
            {edit.slides.map((s, i) => <SlideEditor key={s.id} s={s} onChange={(x) => upd(x, i)} onDelete={() => setEdit({ ...edit, slides: edit.slides.filter((_, j) => j !== i) })} />)}
            <div className="flex gap-2"><Button variant="secondary" onClick={() => setEdit({ ...edit, slides: [...edit.slides, newSlide()] })}>＋ Slide</Button><Button className="flex-1" onClick={save}>Save slideshow</Button></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
