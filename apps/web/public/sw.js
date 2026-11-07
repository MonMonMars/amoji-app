/* Amoji offline shell ??r2026-11-03.1
 * Hand-rolled service worker (zero dependencies, works with Next.js static
 * export where build-time PWA plugins struggle).
 *
 * Strategy:
 *   install   ??precache the app shell so a revisit works fully offline
 *   navigate  ??network-first, cached page as fallback, else splash shell
 *   assets    ??cache-first (VRM models, portraits, js/css), filled on demand
 *
 * Cross-origin calls (Pollinations LLM / TTS) are left to the network:
 * the companion simply tells you she needs a connection when she's offline.
 *
 * r136: CACHE bumped (r117 ??r136) ??every client now drops the stale shell
 * and re-fetches; a stale cached shell was referencing dead JS chunks, which
 * is the classic "page renders but nothing is clickable / no voice" shape.
 */
'use strict';

var CACHE = 'amoji-r2026-11-08.19';
var SHELL = [
  './',
  './chat',
  './play',
  './select',
  './change',
  './login',
  './mode',
  './setup',
  './story',
  './privacy',
  './terms',
  './manifest.webmanifest',
  './icon.svg',
  './favicon.ico',
];
var MAX_ENTRIES = 300;
/**
 * Scope-relative shell URLs, precomputed so trim() can recognise them without
 * rebuilding a URL for every key on every trim pass.
 */
function shellUrls() {
  return SHELL.map(function (p) {
    return new URL(p, self.registration.scope).href;
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        // Individual adds: one missing page must not abort the precache.
        return Promise.all(
          SHELL.map(function (p) {
            return cache.add(new URL(p, self.registration.scope)).catch(function () {});
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (k) {
            if (k.indexOf('amoji-') === 0 && k !== CACHE) return caches.delete(k);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function trim(cache) {
  return cache.keys().then(function (keys) {
    // The shell is precached at install, which makes it the OLDEST entries —
    // so a plain oldest-first trim deleted the offline pages first and left
    // 300 thumbnails. Installed app then opened to a blank frame with no
    // cached page to fall back to. The shell is the whole point of the cache:
    // never evict it, and cap only the opportunistic asset entries on top.
    var shell = shellUrls();
    var evictable = keys.filter(function (req) {
      return shell.indexOf(req.url) === -1;
    });
    if (evictable.length <= MAX_ENTRIES) return null;
    var oldest = evictable.slice(0, evictable.length - MAX_ENTRIES);
    return Promise.all(
      oldest.map(function (req) {
        return cache.delete(req);
      })
    );
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // LLM / TTS / CDN calls
  if (url.pathname.indexOf('/api/') !== -1) return; // live data stays live

  if (request.mode === 'navigate') {
    // Pages: try the network, fall back to cache, then to the splash shell.
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            if (cached) return cached;
            return caches.match(new URL('./', self.registration.scope));
          });
        })
    );
    return;
  }

  // Assets: cache-first; fill from the network on first hit, then cap size.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && (response.ok || response.type === 'opaque')) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy).then(function () {
              trim(cache);
            });
          });
        }
        return response;
      });
    })
  );
});


