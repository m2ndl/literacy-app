// service-worker.js - Minimal PWA service worker for offline functionality
const CACHE_NAME = 'lughatii-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/logic.js',
  '/data.js',
  '/styles.css',
  '/tailwind.css',
  '/icon-192.png',
  '/icon-512.png',
  // External resources
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap'
];

// Install event - cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Cache internal files, external ones might fail and that's OK
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => 
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

// Fetch event - serve from cache when available, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome extension requests and non-http(s)
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache our own resources and fonts
              if (event.request.url.startsWith(self.location.origin) || 
                  event.request.url.includes('fonts.googleapis.com') ||
                  event.request.url.includes('fonts.gstatic.com')) {
                cache.put(event.request, responseToCache);
              }
            });
          
          return response;
        }).catch(error => {
          // Network request failed, try to get from cache anyway
          console.log('Fetch failed, returning offline page:', error);
          return caches.match('/index.html');
        });
      })
  );
});

// Listen for messages from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
