import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pickName, useLang } from '../../lib/i18n';
import { speak } from '../../lib/speech';
import type { Slideshow } from '../../lib/types';
import { runAction } from './actions';

const H = { sm: 'h-36', md: 'h-48', lg: 'h-64' } as const;

export default function SlideShow({ show }: { show: Slideshow }) {
  const { lang } = useLang();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const touch = useRef<number | null>(null);
  const n = show.slides.length;
  const cur = Math.min(i, n - 1);

  useEffect(() => {
    if (n < 2 || pause) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), Math.max(2, show.intervalSec) * 1000);
    return () => clearInterval(t);
  }, [n, pause, show.intervalSec]);

  if (n === 0) return null;
  const go = (d: number) => setI((x) => (x + d + n) % n);
  const frame = 'relative overflow-hidden rounded-2xl ' + H[show.height] + (show.border ? ' border-4 border-leaf-600 shadow-md' : '');

  return (
    <div className={frame} data-testid={'slideshow-' + show.placement}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPause(true); }}
      onTouchEnd={(e) => { if (touch.current !== null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); } touch.current = null; setPause(false); }}>
      <div className={show.transition === 'slide' ? 'flex h-full transition-transform duration-500' : 'relative h-full'}
        style={show.transition === 'slide' ? { transform: `translateX(-${cur * 100}%)` } : undefined}>
        {show.slides.map((s, idx) => {
          const [c1, c2] = (s.bg || '#15803d,#4ade80').split(',');
          const title = pickName(s.title, lang);
          const sub = pickName(s.subtitle, lang);
          const base = show.transition === 'slide' ? 'relative h-full w-full shrink-0' : 'absolute inset-0 transition-opacity duration-700 ' + (idx === cur ? 'opacity-100' : 'pointer-events-none opacity-0');
          return (
            <div key={s.id} className={base} onClick={() => runAction(s.action, nav)} style={{ cursor: s.action ? 'pointer' : 'default' }}>
              {s.image ? <img src={s.image} alt={title} className="absolute inset-0 h-full w-full object-cover" /> : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2 || c1})` }}>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-7xl opacity-90">{s.emoji}</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              {s.ribbon ? <span className="absolute left-0 top-3 rounded-r-full bg-red-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow">{s.ribbon}</span> : null}
              <div className="absolute inset-y-0 left-0 flex max-w-[75%] flex-col justify-center gap-1 p-4 pt-9 text-white">
                {title ? <div className="text-xl font-extrabold leading-tight drop-shadow">{title}</div> : null}
                {sub ? <div className="text-sm font-medium opacity-95 drop-shadow">{sub}</div> : null}
                {s.buttons.length ? (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {s.buttons.map((b, k) => (
                      <button key={k} onClick={(e) => { e.stopPropagation(); runAction(b, nav); }} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-leaf-800 shadow active:scale-95">
                        {b.type === 'call' ? '📞 ' : b.type === 'whatsapp' ? '💬 ' : ''}{pickName(b.label, lang) || '→'}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {(title || sub) ? (
                <button aria-label="read aloud" onClick={(e) => { e.stopPropagation(); speak([title, sub].filter(Boolean).join('. '), lang); }}
                  className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-1 text-sm text-white">🔊</button>
              ) : null}
            </div>
          );
        })}
      </div>
      {n > 1 ? (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {show.slides.map((s, k) => <button key={s.id} aria-label={'slide ' + (k + 1)} onClick={(e) => { e.stopPropagation(); setI(k); }} className={'h-1.5 rounded-full transition-all ' + (k === cur ? 'w-5 bg-white' : 'w-1.5 bg-white/60')} />)}
        </div>
      ) : null}
    </div>
  );
}
