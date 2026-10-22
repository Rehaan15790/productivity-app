const V = 'productivity-v4';
const PAGE = 'index.html';
const EXTRA = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];
const FONTS = /^fonts\.(googleapis|gstatic)\.com$/;

const store = (key, res) =>
  res.ok || res.type === 'opaque' ? caches.open(V).then(c => c.put(key, res.clone())).then(() => res) : res;

const page = req => new Promise(resolve => {
  let done = false;
  const finish = res => res && !done && (done = true, resolve(res));
  const cached = () => caches.match(PAGE);
  fetch(req).then(res => store(PAGE, res)).then(finish, () => cached().then(hit => finish(hit || Response.error())));
  setTimeout(() => cached().then(finish), 4000);
});

self.addEventListener('install', e => e.waitUntil(
  caches.open(V)
    .then(c => Promise.all([c.add(PAGE), ...EXTRA.map(u => c.add(u).catch(() => {}))]))
    .then(() => self.skipWaiting())
));

self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') return e.respondWith(page(req));
  if (url.origin === location.origin || FONTS.test(url.hostname))
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res))));
});
