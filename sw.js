/*
 * Service worker de l'app PyConES 26
 *
 * - L'app (HTML, CSS, icones, fonts) es guarda al mòbil la primera vegada que s'obre amb connexió.
 * - L'HTML es demana primer a la xarxa (així els canvis d'horari arriben sols) i, si no hi ha
 *   cobertura o tarda més de 3 s, s'obre la còpia guardada.
 * - CSS, JS, fonts i icones surten de la còpia guardada i s'actualitzen en segon pla.
 *
 * IMPORTANT: quan canviïs app.css, lucide.js o qualsevol fitxer que no sigui l'HTML,
 * puja el número de VERSION perquè tothom rebi la versió nova.
 */
const VERSION = 'v7';
const APP_CACHE = `pycones26-app-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

const APP_FILES = [
  './',
  './index.html',
  './app.css',
  './lucide.js',
  './manifest.webmanifest',
  './favicon.ico',
  './icons/icon.svg',
  './fonts/inter-latin-wght-normal.woff2',
  './fonts/inter-latin-ext-wght-normal.woff2',
  './fonts/bricolage-grotesque-latin-500-normal.woff2',
  './fonts/bricolage-grotesque-latin-700-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => (key.startsWith('pycones26-app-') && key !== APP_CACHE) || key === 'pycones26-photos')
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Obrir l'app: xarxa primer, còpia guardada si no hi ha cobertura
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // 2. Fitxers de l'app: còpia guardada al moment, actualitzada en segon pla
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, APP_CACHE));
    return;
  }

  // La resta (Maps, Telegram...) va directa a la xarxa
});

async function networkFirstPage(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response && response.ok) {
      cache.put('./index.html', response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match('./index.html') || await cache.match('./', { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  const response = await network;
  return response || Response.error();
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}
