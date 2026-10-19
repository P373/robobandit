// Keeps the app shell available offline. Pages and scripts are fetched fresh when
// online (network first) so updates show up immediately; the cache is the fallback.
// Forecast data is cached separately by app.js in localStorage.
const CACHE = 'capevisual-v6';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'icons.js', 'map.js', 'vendor/suncalc.js', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'icons/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
