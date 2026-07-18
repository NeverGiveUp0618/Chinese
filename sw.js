const CACHE = "treasure-writing-v33";
const CORE = ["./", "./index.html", "./data.js", "./check.js", "./app.js", "./manifest.json", "./audio/baibai/manifest.js", "./assets/baibai-base.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const fallback = e.request.mode === "navigate" ? await c.match("./index.html") : await c.match(e.request);
    const fresh = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => fallback);
    return fallback || fresh;
  }));
});
