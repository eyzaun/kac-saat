// Smarter service worker: network-first for HTML, cache-first for immutable assets
const CACHE_NAME = 'kac-saat-cache-v9';

self.addEventListener('install', (event) => {
  // Activate immediately on install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

function isImmutableAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/assets/') || /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|json|webmanifest|map)$/.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (isNavigationRequest(request)) {
    // Network-first for HTML to avoid serving stale index.html with old hashed asset references
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        // Optionally update cache
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(request);
        return cached || caches.match('/index.html');
      }
    })());
    return;
  }

  if (isImmutableAsset(request)) {
    // Cache-first for versioned assets
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  // Default: pass-through
  event.respondWith(fetch(request));
});
