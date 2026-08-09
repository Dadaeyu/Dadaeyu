const CACHE_PREFIX = "dadaeyu-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-v1`;
const STATIC_CACHE = `${CACHE_PREFIX}static-v1`;
const ACTIVE_CACHES = new Set([SHELL_CACHE, STATIC_CACHE]);
const PRECACHE_URLS = [
  "/offline.html",
  "/icons/apple-touch-icon.png",
  "/icons/pwa-192x192.png",
  "/icons/pwa-512x512.png",
  "/icons/pwa-maskable-192x192.png",
  "/icons/pwa-maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
      self.skipWaiting()
    ])
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) => cacheName.startsWith(CACHE_PREFIX) && !ACTIVE_CACHES.has(cacheName)
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlineResponse = await caches.match("/offline.html");
        return (
          offlineResponse ??
          new Response("인터넷 연결을 확인한 뒤 다시 시도해 주세요.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          })
        );
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/") || request.headers.has("RSC")) return;

  const isPrecached = PRECACHE_URLS.includes(url.pathname);
  const isVersionedNextAsset = url.pathname.startsWith("/_next/static/");
  if (!isPrecached && !isVersionedNextAsset) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;

      const networkResponse = await fetch(request);
      if (networkResponse.ok && networkResponse.type === "basic") {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
  );
});
