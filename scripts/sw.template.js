// Simply PDF offline service worker. Built into dist/sw.js by vite.config.ts,
// which fills in __VERSION__ and the list of app files.
//
// What it does: keeps a copy of the app's own files so Simply PDF opens and
// works with no connection. What it never does: see, fetch or store your
// documents. Files you open are read straight from your device into memory and
// are never requested over the network, so they never pass through here.
const VERSION = '__VERSION__';
const CORE = __CORE__;
const APP = `simply-pdf-app-${VERSION}`;
// pdf.js CJK character maps and scanned-image decoders: large, rarely needed,
// cached the first time a document needs them. (Its standard fonts are in APP.)
const EXTRAS = 'simply-pdf-pdfjs';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP && k !== EXTRAS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: try the network for the newest version, fall back to the saved app.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(APP).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/', { cacheName: APP })),
    );
    return;
  }

  // pdf.js files: cache-first; the large extras are saved the first time they're used.
  if (url.pathname.startsWith('/pdfjs/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(EXTRAS).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (hashed scripts, styles, fonts, icons): cache-first.
  event.respondWith(caches.match(req, { cacheName: APP }).then((hit) => hit || fetch(req)));
});
