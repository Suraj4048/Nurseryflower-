import { api } from '../api';
import { useLive } from './hooks';
import { pickName, useLang } from '../lib/i18n';

/** Multi-select category chips (dynamic list from Office > Categories). allowed = partner rule se filter. */
export function CategoryPicker({ value, onChange, allowed }: { value: string[]; onChange: (v: string[]) => void; allowed?: string[] }) {
  const { lang } = useLang();
  const { data } = useLive(() => api.listCategories(), []);
  const list = (data ?? []).filter((c) => c.active && (!allowed || allowed.includes(c.key)));
  const tog = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((c) => (
        <button type="button" key={c.key} onClick={() => tog(c.key)}
          className={'rounded-full border px-3 py-1 text-sm font-semibold ' + (value.includes(c.key) ? 'border-leaf-600 bg-leaf-50 text-leaf-800' : 'border-slate-300 text-slate-600')}>
          {c.emoji} {pickName(c.name, lang)}
        </button>
      ))}
    </div>
  );
}

export const RIBBONS = ['', 'Hot Deals', 'New', 'Best Seller', 'Offer'];
