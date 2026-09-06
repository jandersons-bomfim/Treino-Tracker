const CACHE_VERSION = 'v1';
const SHELL_CACHE = 'treino-shell-' + CACHE_VERSION;
const FONT_CACHE = 'treino-fonts-' + CACHE_VERSION;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL_CACHE && k !== FONT_CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Fonts: cache-first, so after the first successful load they work fully offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const resp = await fetch(event.request);
          if (resp.ok) cache.put(event.request, resp.clone());
          return resp;
        } catch (e) {
          return cached || new Response('', { status: 504 });
        }
      })
    );
    return;
  }

  // App shell: cache-first, falling back to network, so the app opens offline
  if (event.request.mode === 'navigate' || SHELL_FILES.some(f => event.request.url.endsWith(f.replace('./','')))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(resp => {
          if (resp.ok) {
            caches.open(SHELL_CACHE).then(cache => cache.put(event.request, resp.clone()));
          }
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }
});
