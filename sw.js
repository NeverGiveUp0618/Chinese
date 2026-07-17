importScripts("./audio/baibai/manifest.js");
const CACHE = "treasure-writing-v25";
const FILES = ["./", "./index.html", "./data.js", "./check.js", "./app.js", "./manifest.json", "./audio/baibai/manifest.js", "./assets/baibai-base.png", ...Object.values(BAIBAI_AUDIO)];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
