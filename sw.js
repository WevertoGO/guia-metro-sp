const CACHE_NAME = 'metro-sp-pwa-v1';
const RUNTIME_CACHE = 'metro-sp-runtime-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

const CACHEABLE_EXTERNAL_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([CACHE_NAME, RUNTIME_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put('./index.html', fresh.clone());
    }
    return fresh;
  } catch (_err) {
    return (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./'));
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
    return;
  }

  if (CACHEABLE_EXTERNAL_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
