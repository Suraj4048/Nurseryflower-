// Simple service worker for partner. Scope: /partner/
const CACHE = 'nl-partner-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((x) => x.startsWith('nl-partner-') && x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
// Network-first; offline par cache se. Sirf GET aur same-origin.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('/partner/')))
  );
});
