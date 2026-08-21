// service-worker.js
// Cache senp pou app la mache offline pou dènye vèsyon konsilte a

const CACHE_NAME = 'kontab-lakay-v2';
const FONT_CACHE_NAME = 'kontab-lakay-fonts-v1';

const CORE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',

    // Core
    '/js/core/config.js',
    '/js/core/db.js',
    '/js/core/theme.js',

    // CSS
    '/assets/css/app.css',
    '/assets/css/theme-light.css',
    '/assets/css/theme-dark.css',
    '/assets/css/print.css',
    '/assets/css/responsive.css',

    // Icons
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',

    // Services
    '/js/services/accountingService.js',
    '/js/services/adminService.js',
    '/js/services/salesService.js',
    '/js/services/productsService.js',
    '/js/services/customersService.js',
    '/js/services/suppliersService.js',
    '/js/services/quotesService.js',
    '/js/services/commandesService.js',
    '/js/services/promotionsService.js',
    '/js/services/fidéliteService.js',
    '/js/services/marketingService.js',
    '/js/services/savService.js',
    '/js/services/objectifsService.js',

    // Modules UI
    '/js/modules/admin_ui.js',
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
                    .filter((name) => name !== CACHE_NAME && name !== FONT_CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// ---------- FETCH: cache-first pou fichye statik + fonts, network-first pou Firestore ----------
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // JAMÈ cache apèl Firestore/Firebase Auth — done kontab dwe toujou vin dirèkteman
    const isFirebaseCall =
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('firebaseio.com');

    if (isFirebaseCall) {
        return; // kite navigatè a jere demand lan nòmalman
    }

    // Google Fonts (CSS + fichye woff2) — cache apa pou yo mache offline
    const isFontRequest =
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com');

    if (isFontRequest) {
        event.respondWith(
            caches.open(FONT_CACHE_NAME).then((cache) =>
                cache.match(event.request).then((cached) => {
                    if (cached) return cached;
                    return fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
            )
        );
        return;
    }

    // Tout lòt resous statik: cache-first
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
