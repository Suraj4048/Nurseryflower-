// ============================================================
// INTEGRATION FILE 5/5: Push / alerts
// Abhi: browser Notification (app khula ho tab) + partner app ka full-screen alarm.
// Baad me (reliable background alarm): Capacitor + Firebase Cloud Messaging (FCM) + Telegram bot backup.
// Wo server-side hota hai: Supabase Database Webhook / Edge Function jo naye order par FCM aur Telegram ko call kare.
// ============================================================
export async function askNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function showLocalNotification(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/icons/partner-192.png' });
  } catch { /* ignore */ }
}

export function registerServiceWorker(scope: string, file: string) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register(file, { scope }).catch(() => { /* ignore */ });
}
