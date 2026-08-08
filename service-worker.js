// service-worker.js
// Cache senp pou app la mache offline pou dènye vèsyon konsilte a

const CACHE_NAME = 'kontab-lakay-v1';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/js/core/config.js',
    '/js/core/db.js',
    '/js/services/accountingService.js',
    '/js/services/salesService.js',
    '/js/services/productsService.js',
    '/js/services/customersService.js',
    '/js/modules/ventes_ui.js'
];

// ---------- ENSTALASYON: cache resous debaz yo ----------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

// ---------- AKTIVASYON: efase ansyen cache yo ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// ---------- FETCH: cache-first pou fichye statik, network-first pou Firestore ----------
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // JAMÈ cache apèl Firestore/Firebase — done kontab dwe toujou vin dirèkteman
    if (url.hostname.includes('firestore') || url.hostname.includes('googleapis')) {
        return; // kite navigatè a jere demand lan nòmalman
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => {
                // Si offline e resous la pa nan cache, ranvoye paj prensipal la
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
