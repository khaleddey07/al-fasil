// Service Worker لمنصة سوقي
// يدعم التثبيت كتطبيق PWA ويعرض صفحة دون اتصال عند فقدان الشبكة
const CACHE_NAME = "souq-v1";
const OFFLINE_URLS = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// استراتيجية: الشبكة أولًا للطلبات الديناميكية، كاش احتياطي للأصول الثابتة
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // تجاوز طلبات API والطلبات غير GET
  if (
    request.method !== "GET" ||
    request.url.includes("/api/") ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // كاش الأصول الثابتة (الأيقونات، manifest، صفحة البداية)
        if (response.ok && (request.url.includes("/icons/") || request.url.includes("/manifest") || request.url === self.location.origin + "/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match("/");
        });
      })
  );
});

// دعم الإشعارات الفورية (للطلبات الجديدة)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
