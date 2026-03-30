const CACHE_NAME = "rcs-cache-v2";
const ASSET_CACHE = [
  "/site.webmanifest",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSET_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const { origin } = self.location;
  if (!event.request.url.startsWith(origin)) return;

  const requestUrl = new URL(event.request.url);
  // Never cache API requests so auth tokens and dynamic JSON are always fresh.
  if (requestUrl.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);

      try {
        const response = await fetch(event.request);

        if (response && response.ok) {
          const clone = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }

        return response || cached || Response.error();
      } catch (error) {
        return cached || Response.error();
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
