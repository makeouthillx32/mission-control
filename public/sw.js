const CACHE = "mc-v2";

// Assets that are safe to cache long-term (content-hashed filenames)
const IMMUTABLE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".woff", ".woff2"];

function isImmutable(url) {
  return IMMUTABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));
}

function isNextChunk(url) {
  // Next.js static chunks — content-hashed, safe to cache
  return url.pathname.startsWith("/_next/static/");
}

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Clear old caches on activation
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always network for API routes — no caching ever
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Next.js content-hashed static chunks — cache-first (safe, filename changes on rebuild)
  if (isNextChunk(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Images and fonts — cache-first (immutable content)
  if (isImmutable(url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Everything else (HTML pages, manifests, sw.js itself) — network-first, no caching
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});