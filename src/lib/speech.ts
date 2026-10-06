import { LANGS, getLang } from './i18n';

const speechCode = (lang: string) => LANGS.find((l) => l.code === lang)?.speech ?? 'en-IN';

/** Voice search: Web Speech API (Chrome/Android). Free. Na chale to typing fallback. */
export function listenOnce(lang = getLang()): Promise<string> {
  return new Promise((resolve, reject) => {
    const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) return reject(new Error('Is browser me voice search nahi hai'));
    const rec = new SR();
    rec.lang = speechCode(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => resolve(String(e.results?.[0]?.[0]?.transcript ?? ''));
    rec.onerror = (e: any) => reject(new Error(e.error || 'Voice error'));
    rec.onend = () => resolve('');
    try { rec.start(); } catch (e) { reject(e as Error); }
  });
}

export function speak(text: string, lang = getLang()) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechCode(lang);
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

// ---- Alarm (Web Audio). Browser me audio tabhi chalta hai jab user ne pehle kuch dabaya ho. ----
let ctx: AudioContext | null = null;
let alarmTimer: number | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* ignore */ }
}

function beep(freq: number, dur: number, when = 0) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = freq;
  g.gain.value = 0.25;
  o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime + when;
  o.start(t); o.stop(t + dur);
}

export function startAlarm() {
  stopAlarm();
  unlockAudio();
  const loop = () => {
    beep(880, 0.25, 0); beep(660, 0.25, 0.3); beep(880, 0.25, 0.6); beep(660, 0.25, 0.9);
    try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* ignore */ }
  };
  loop();
  alarmTimer = window.setInterval(loop, 1800);
}

export function stopAlarm() {
  if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
  try { navigator.vibrate?.(0); window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
