const CACHE_NAME = "nos-os-phase1-v2";
const APP_SHELL = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icons/nos-icon-192.png",
  "/icons/nos-icon-512.png",
  "/brand/nos-technology-mark.png",
  "/brand/nos-technology-lockup.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() ?? { title: "Nos OS", body: "新しい通知があります。" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/nos-icon-192.png",
      badge: "/icons/nos-icon-192.png",
    }),
  );
});
