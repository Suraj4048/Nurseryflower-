import { useEffect, useState } from 'react';
import { DICT } from './locales';

export interface LangInfo { code: string; name: string; flag: string; rtl: boolean; speech: string }

// 17 languages
export const LANGS: LangInfo[] = [
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', rtl: false, speech: 'hi-IN' },
  { code: 'en', name: 'English', flag: '🇬🇧', rtl: false, speech: 'en-IN' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩', rtl: false, speech: 'bn-IN' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', rtl: false, speech: 'ta-IN' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳', rtl: false, speech: 'te-IN' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳', rtl: false, speech: 'mr-IN' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳', rtl: false, speech: 'gu-IN' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳', rtl: false, speech: 'kn-IN' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳', rtl: false, speech: 'ml-IN' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳', rtl: false, speech: 'pa-IN' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true, speech: 'ur-IN' },
  { code: 'es', name: 'Español', flag: '🇪🇸', rtl: false, speech: 'es-ES' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false, speech: 'fr-FR' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', rtl: false, speech: 'de-DE' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true, speech: 'ar-SA' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', rtl: false, speech: 'pt-BR' },
  { code: 'zh', name: '中文', flag: '🇨🇳', rtl: false, speech: 'zh-CN' },
];

const KEY = 'nl_lang';
let current: string = (() => { try { return localStorage.getItem(KEY) ?? 'hi'; } catch { return 'hi'; } })();
const subs = new Set<() => void>();

function apply() {
  const info = LANGS.find((l) => l.code === current);
  document.documentElement.lang = current;
  document.documentElement.dir = info?.rtl ? 'rtl' : 'ltr';
}
apply();

export const hasChosenLang = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
export const getLang = () => current;
export function setLang(code: string) {
  current = code;
  try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
  apply();
  subs.forEach((f) => f());
}

/** t('key', {name: 'x'}) : selected language -> English -> key */
export function t(key: string, vars?: Record<string, string | number>): string {
  let s = DICT[current]?.[key] ?? DICT.en[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

/** Plant/product ke naam: selected language -> Hindi -> English -> koi bhi */
export function pickName(name: Record<string, string>, lang = current): string {
  return name[lang] || name.hi || name.en || Object.values(name)[0] || '';
}

export function useLang() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return { lang: current, t, setLang, rtl: !!LANGS.find((l) => l.code === current)?.rtl };
}
