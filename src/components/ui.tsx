import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { LANGS, useLang } from '../lib/i18n';
import { config, isDemo } from '../config';

// ---------- toast ----------
type Toast = { id: number; msg: string; kind: 'ok' | 'err' };
let toasts: Toast[] = [];
const tsubs = new Set<() => void>();
export function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, msg, kind }];
  tsubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== id); tsubs.forEach((f) => f()); }, 3800);
}
export const toastErr = (e: unknown) => toast((e as Error)?.message || 'Error', 'err');

export function Toaster() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((x) => x + 1); tsubs.add(f); return () => { tsubs.delete(f); }; }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((x) => (
        <div key={x.id} className={'pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ' + (x.kind === 'ok' ? 'bg-leaf-700' : 'bg-red-600')}>{x.msg}</div>
      ))}
    </div>
  );
}

// ---------- basic ----------
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'amber' | 'dark'; size?: 'sm' | 'md' | 'lg' | 'xl'; loading?: boolean; block?: boolean };
export function Button({ variant = 'primary', size = 'md', loading, block, className = '', children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-leaf-600 text-white hover:bg-leaf-700 active:bg-leaf-800',
    secondary: 'bg-white text-leaf-800 border border-leaf-200 hover:bg-leaf-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    amber: 'bg-amber-600 text-white hover:bg-amber-700',
    dark: 'bg-slate-800 text-white hover:bg-slate-900',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-base', lg: 'px-5 py-3.5 text-lg', xl: 'px-6 py-5 text-2xl' }[size];
  return (
    <button {...rest} disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 ${v} ${s} ${block ? 'w-full' : ''} ${className}`}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const c = { gray: 'bg-slate-100 text-slate-700', green: 'bg-leaf-100 text-leaf-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-700', blue: 'bg-sky-100 text-sky-800' }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-200';
export function Input(p: InputHTMLAttributes<HTMLInputElement>) { return <input {...p} className={inputCls + ' ' + (p.className ?? '')} />; }
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...p} className={inputCls + ' ' + (p.className ?? '')} />; }
export function TextArea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...p} className={inputCls + ' ' + (p.className ?? '')} />; }

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-xl text-slate-500 hover:bg-slate-100" aria-label="close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ text }: { text?: string }) {
  return <div className="flex items-center justify-center gap-3 p-8 text-slate-500"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-leaf-600" />{text}</div>;
}
export function Empty({ text, emoji = '🌱' }: { text: string; emoji?: string }) {
  return <div className="p-10 text-center text-slate-500"><div className="mb-2 text-5xl">{emoji}</div>{text}</div>;
}

export function PhotoThumb({ src, className = '' }: { src: string; className?: string }) {
  const isImg = src.startsWith('data:') || src.startsWith('http');
  return isImg
    ? <img src={src} alt="" className={'object-cover ' + className} />
    : <div className={'flex items-center justify-center bg-leaf-50 ' + className}><span className="text-5xl">{src || '🌱'}</span></div>;
}

// ---------- language picker ----------
export function LangGrid({ onPick, big = false }: { onPick?: (code: string) => void; big?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => { setLang(l.code); onPick?.(l.code); }}
          className={`flex items-center gap-2 rounded-xl border px-3 text-left font-semibold ${big ? 'py-4 text-xl' : 'py-2.5 text-base'} ${lang === l.code ? 'border-leaf-600 bg-leaf-50 text-leaf-800' : 'border-slate-200 bg-white'}`}>
          <span className={big ? 'text-3xl' : 'text-xl'}>{l.flag}</span>{l.name}
        </button>
      ))}
    </div>
  );
}

// ---------- demo banner / gate ----------
export function DemoBanner() {
  if (!isDemo) return null;
  return <div className="bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold text-amber-900">DEMO MODE: data sirf is browser me hai. Asli customers ke liye VITE_MODE=supabase karo.</div>;
}

export function DemoGate({ children }: { children: ReactNode }) {
  const need = isDemo && config.demoAccessCode;
  const [ok, setOk] = useState(() => !need || sessionStorage.getItem('nl_gate') === '1');
  const [v, setV] = useState('');
  if (ok) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-leaf-50 p-6">
      <div className="text-5xl">🔒</div>
      <div className="text-lg font-bold">Private demo</div>
      <Input type="password" placeholder="Access code" value={v} onChange={(e) => setV(e.target.value)} className="max-w-xs" />
      <Button onClick={() => { if (v === config.demoAccessCode) { sessionStorage.setItem('nl_gate', '1'); setOk(true); } else toast('Galat code', 'err'); }}>Open</Button>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = (['delivered', 'live', 'approved'].includes(status) ? 'green'
    : ['cancelled', 'rejected', 'expired'].includes(status) ? 'red'
    : ['new', 'submitted', 'pending', 'under_review', 'need_more_info'].includes(status) ? 'amber' : 'blue') as 'green' | 'red' | 'amber' | 'blue';
  return <Badge tone={tone}>{label}</Badge>;
}
