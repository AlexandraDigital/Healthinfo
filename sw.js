const CACHE_NAME = 'mediq-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS).catch(err => {
          console.warn('⚠️ Some assets failed to cache during install:', err);
          // Continue even if some assets fail
          return Promise.resolve();
        });
      })
      .catch(err => {
        console.error('❌ Cache open failed:', err);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // IMPORTANT: Skip caching for API calls - let them go directly to network
  if (url.pathname.startsWith('/api/')) {
    return event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.error('❌ API request failed:', error.message);
          return new Response(JSON.stringify({ error: 'Network error' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  }
  
  // Skip caching for external scripts (Google CSE, fonts, etc.)
  if (url.hostname !== new URL(event.request.url).hostname) {
    return event.respondWith(
      fetch(event.request).catch(error => {
        console.warn('⚠️ External resource failed to load:', url.hostname);
        return new Response('External resource unavailable', { status: 503 });
      })
    );
  }
  
  // Cache-first strategy for static assets (GET only)
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) return response;
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone).catch(err => {
                console.warn('⚠️ Failed to cache response:', err.message);
              });
            })
            .catch(err => {
              console.warn('⚠️ Cache open failed:', err.message);
            });
          
          return response;
        }).catch(error => {
          console.warn('⚠️ Fetch failed, returning cached version:', error.message);
          return caches.match(event.request)
            .catch(() => new Response('Offline - resource not cached', { status: 503 }));
        });
      })
      .catch(error => {
        console.error('❌ Cache match error:', error.message);
        return new Response('Service Worker error', { status: 500 });
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName).catch(err => {
                console.warn('⚠️ Failed to delete cache:', cacheName, err.message);
              });
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .catch(err => {
        console.error('❌ Activation error:', err.message);
      })
  );
});
