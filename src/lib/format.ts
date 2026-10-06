export const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return s + 's';
  if (s < 3600) return Math.round(s / 60) + 'm';
  if (s < 86400) return Math.round(s / 3600) + 'h';
  return Math.round(s / 86400) + 'd';
};
export const fmtDate = (ts?: number) => (ts ? new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
export const digits = (s: string) => s.replace(/\D/g, '');
export const isPhone = (s: string) => /^[6-9]\d{9}$/.test(digits(s).slice(-10));
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
