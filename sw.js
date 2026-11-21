const CACHE_NAME = "cara-pwa-v9";
const CORE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/img/cara-favicon.png",
  "/img/cara-app-icon.svg",
  "/css/fonts.css",
  "/css/offline.css",
  "/js/offline.js",
  "/fonts/vazirmatn-arabic-400.woff2",
  "/fonts/vazirmatn-arabic-700.woff2",
  "/fonts/vazirmatn-arabic-900.woff2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url)));
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("cara-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/* Web Share Target: the browser posts the shared image here, we park it in a
   short-lived cache and send the user to the photo-to-pattern page. */
async function receiveSharedImage(request) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (file && typeof file === "object" && file.size > 0) {
      const cache = await caches.open("cara-share-target");
      await cache.put("/shared-image", new Response(file, {
        headers: { "Content-Type": file.type || "image/jpeg", "X-Cara-Name": encodeURIComponent(file.name || "shared.jpg") },
      }));
      return Response.redirect("/upload.html?shared=1", 303);
    }
  } catch (error) {
    console.warn("share target failed", error);
  }
  return Response.redirect("/upload.html?shared=none", 303);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname === "/share-target.html" && request.method === "POST") {
    event.respondWith(receiveSharedImage(request));
    return;
  }

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request))
          || (await cache.match("/"))
          || (await cache.match("/offline.html"));
      }
    })());
    return;
  }

  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    })());
  }
});
