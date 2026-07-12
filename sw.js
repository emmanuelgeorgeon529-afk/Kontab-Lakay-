const CACHE = 'kontab-lakay-v5';
const FILES = ['./','./index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Pa entèsepte rekèt ki soti pou Firebase/Google (auth, firestore, sdk).
  // Kite navigatè a jere yo natirèlman pou pa kraze koneksyon tan reyèl yo.
  if (url.origin !== self.location.origin) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(()=>{}))
  );
});
