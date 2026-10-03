// service-worker.js - Offline support.
// Bump SHELL_CACHE whenever app files change. Audio clips live in their own cache: their URLs
// carry a content hash (?v=...), so app updates don't throw away audio the learner downloaded.
const SHELL_CACHE = 'lughatii-v8';
const AUDIO_CACHE = 'lughatii-audio-v1';
const PREFIX = 'lughatii-';
const NETWORK_TIMEOUT_MS = 4000;

// Paths are relative to this file so the app works from a sub-folder (e.g. GitHub Pages).
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './logic.js',
  './learner.js',
  './data.js',
  './data-stages3-5.js',
  './data-assess.js',
  './assess.js',
  './assess-ui.js',
  './drill.js',
  './recorder.js',
  './phonics.js',
  './questions.js',
  './audio.js',
  './dom.js',
  './widgets.js',
  './tracing.js',
  './backup.js',
  './backup-ui.js',
  './platform.js',
  './theme.js',
  './styles.css',
  './tailwind.css',
  './ui-overrides.css',
  './semantic-tokens.css',
  './fonts/andika.css',
  './fonts/andika-400.woff2',
  './fonts/andika-700.woff2',
  './audio/manifest.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // External resources (may fail, that's OK)
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => Promise.allSettled(
      urlsToCache.map(url => cache.add(url).catch(() => console.log('Failed to cache:', url)))
    ))
  );
  self.skipWaiting();
});

// Only delete this app's old caches; other apps on the same origin (GitHub Pages) keep theirs.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names
        .filter(n => n.startsWith(PREFIX) && n !== SHELL_CACHE && n !== AUDIO_CACHE)
        .map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isOwnFile = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isOwnFile && !isFont) return; // e.g. analytics: leave to the browser

  const isAudioClip = isOwnFile && url.pathname.includes('/audio/') && !url.pathname.endsWith('manifest.json');
  event.respondWith(isAudioClip ? cacheFirst(request) : networkFirst(request));
});

// Audio clips never change at a given URL, so serve them from the cache when we have them.
async function cacheFirst(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return Response.error();
  }
}

// App files: network first so updates show up, falling back to the cache when offline or slow.
function networkFirst(request) {
  return new Promise(resolve => {
    let settled = false;
    const fromCache = async () => (await caches.match(request)) ||
      (request.mode === 'navigate' ? await caches.match('./index.html') : undefined);
    const timer = setTimeout(async () => {
      const cached = await fromCache();
      if (cached && !settled) { settled = true; resolve(cached); }
    }, NETWORK_TIMEOUT_MS);
    fetch(request)
      .then(response => {
        if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
        }
        if (!settled) { settled = true; clearTimeout(timer); resolve(response); }
      })
      .catch(async () => {
        clearTimeout(timer);
        if (settled) return;
        settled = true;
        resolve((await fromCache()) || Response.error());
      });
  });
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
