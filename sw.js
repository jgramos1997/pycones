/*
 * Service worker de l'app PyConES 26
 *
 * - L'app (HTML, CSS, icones, fonts) es guarda al mòbil la primera vegada que s'obre amb connexió.
 * - L'HTML es demana primer a la xarxa (així els canvis d'horari arriben sols) i, si no hi ha
 *   cobertura o tarda més de 3 s, s'obre la còpia guardada.
 * - CSS, JS, fonts i icones surten de la còpia guardada i s'actualitzen en segon pla.
 * - Les fotos de Drive que ja s'han vist es guarden per poder-les tornar a veure sense xarxa.
 *
 * IMPORTANT: quan canviïs app.css, lucide.js o qualsevol fitxer que no sigui l'HTML,
 * puja el número de VERSION perquè tothom rebi la versió nova.
 */
const VERSION = 'v5';
const APP_CACHE = `pycones26-app-${VERSION}`;
const PHOTO_CACHE = 'pycones26-photos';
const MAX_PHOTOS = 80;
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
          .filter((key) => key.startsWith('pycones26-app-') && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return; // les pujades de fotos (POST) van directes a la xarxa

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

  // 3. Fotos de Google Drive ja vistes: es guarden per veure-les sense xarxa
  if (request.destination === 'image') {
    event.respondWith(cachedPhoto(request));
  }
  // La resta (Apps Script, Maps, Telegram...) va directa a la xarxa
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

async function cachedPhoto(request) {
  const cache = await caches.open(PHOTO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Les imatges d'un altre domini arriben "opaques" (status 0): també es poden guardar
    if (response && (response.ok || response.type === 'opaque')) {
      await cache.put(request, response.clone());
      trimCache(cache, MAX_PHOTOS);
    }
    return response;
  } catch (err) {
    return Response.error();
  }
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
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
