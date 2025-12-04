// Service Worker V2 - Caching Robusto
const CACHE_NAME = 'workchat-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Forza l'attivazione immediata
  self.skipWaiting();
  
  // Pre-cache dei file critici
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Prende il controllo subito
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Strategia: Network First, falling back to Cache
  // Prova a scaricare dal server. Se fallisce (offline o 404), usa la copia salvata.
  
  if (event.request.mode === 'navigate') {
    // Se è una navigazione (apertura app), prova rete poi cache index.html
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Per altri file (immagini, script)
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});