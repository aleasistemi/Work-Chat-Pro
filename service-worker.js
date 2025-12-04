// Service Worker minimale per soddisfare i requisiti PWA di Chrome
// Questo permette di mostrare il banner "Installa App"

self.addEventListener('install', (event) => {
  // Forza l'attivazione immediata del service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Prende il controllo di tutte le pagine aperte immediatamente
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Semplice pass-through: prende i dati dalla rete.
  // In una app offline-first qui ci sarebbe la cache, ma per una chat live
  // preferiamo avere sempre i dati freschi dalla rete.
  event.respondWith(fetch(event.request));
});