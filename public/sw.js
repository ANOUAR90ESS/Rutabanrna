// BarnaTransit service worker: works offline with the official TMB timetable.
// Bump VERSION whenever public/data/tmb-network.json is regenerated from a new GTFS feed.
const VERSION = 'bt-v2-gtfs-20260921';
const DATA_CACHE = 'tmb-network-data'; // shared with src/services/offlineStorage.ts
const DATA_URL = '/data/tmb-network.json';
const CORE = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const networkFirst = (req, cacheName, key) =>
  fetch(req)
    .then((r) => {
      if (r.ok) {
        const cp = r.clone();
        caches.open(cacheName).then((c) => c.put(key || req, cp));
      }
      return r;
    })
    .catch(() => caches.match(key || req));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pages and the timetable: network first (freshest data), cached copy when offline.
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, VERSION, '/index.html'));
    return;
  }
  if (url.origin === location.origin && url.pathname === DATA_URL) {
    e.respondWith(networkFirst(req, DATA_CACHE, DATA_URL));
    return;
  }

  // Static assets, fonts and map tiles: cache first.
  const cacheable =
    url.origin === location.origin ||
    url.host.endsWith('fonts.googleapis.com') ||
    url.host.endsWith('fonts.gstatic.com') ||
    url.host.endsWith('basemaps.cartocdn.com') ||
    url.host === 'unpkg.com';
  if (!cacheable) return; // e.g. TMB real-time API: always live
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((r) => {
          if (r.ok || r.type === 'opaque') {
            const cp = r.clone();
            caches.open(VERSION).then((c) => c.put(req, cp));
          }
          return r;
        })
    )
  );
});
