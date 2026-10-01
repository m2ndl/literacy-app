// service-worker.js - Minimal PWA service worker for offline functionality
// Bump CACHE_NAME whenever this file changes so old caches get cleaned up.
const CACHE_NAME = 'lughatii-v3';
// Paths are relative to this file so they work when the app is served from a sub-folder
// (e.g. GitHub Pages: /literacy-app/).
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './logic.js',
  './data.js',
  './theme.js',
  './activities-enhance.js',
  './styles.css',
  './tailwind.css',
  './ui-overrides.css',
  './semantic-tokens.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // External resources
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache internal files, external ones might fail and that's OK
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(() =>
              console.log('Failed to cache:', url)
            )
          )
        );
      })
  );
  // Force the service worker to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first so updates show up right away; the cache is only used offline
self.addEventListener('fetch', event => {
  const request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Only handle our own files and Google Fonts. Everything else (e.g. the analytics
  // script) is left to the browser so a slow third-party server can't hold up the app.
  const url = new URL(request.url);
  const isOwnFile = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isOwnFile && !isFont) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Keep a copy of good responses for offline use
        if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
        }
        return response;
      })
      .catch(async () => {
        // Offline - use the cached copy (or the app shell for page loads)
        const cached = await caches.match(request) ||
          (request.mode === 'navigate' && await caches.match('./index.html'));
        return cached || Response.error();
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
