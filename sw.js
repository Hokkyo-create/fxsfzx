// sw.js

const CACHE_NAME = 'arc7hive-cache-v3'; // Incremented version for new updates
const URLS_TO_CACHE = [
  '/',
  '/index.html',
];

// Install: Cache the app shell. The new SW will wait to be activated.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Activate: Clean up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Listen for a message from the client to skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// Fetch: Stale-While-Revalidate strategy
self.addEventListener('fetch', event => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Exclude Firebase from caching to ensure real-time data
  if (event.request.url.includes('firebaseio.com')) {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(response => {
        // Fetch from network in the background to update the cache for next time
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // If we get a valid response, update the cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            // Network request failed, but we might have a cached response.
            // If not, the error will propagate.
            console.error('Fetch failed; returning offline page instead.', err);
        });

        // Return the cached response immediately if it exists, otherwise wait for the network
        return response || fetchPromise;
      });
    })
  );
});