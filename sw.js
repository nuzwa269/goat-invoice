/* GOAT Invoice – offline support.
   Own files: network first (so a new deploy shows up at once), cache as the offline fallback.
   Fonts and the picture-export library: cache first, they never change. */
const CACHE = 'goat-invoice-v1';
const SHELL = ['./', 'index.html', 'logo.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=League+Gothic&family=Sofia+Sans+Condensed:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Nunito+Sans:wght@400;700&display=swap';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).then(() => c.add(new Request(FONT_CSS, { mode: 'no-cors' })).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const keep = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => keep(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res)))
    );
  }
});
