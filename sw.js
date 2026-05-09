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
  const isExternalResource = url.hostname !== self.location.hostname;
  
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
  
  // Handle external resources (Google Fonts, Google CSE, etc.) with graceful fallback
  if (isExternalResource) {
    return event.respondWith(
      fetch(event.request)
        .then(response => {
          // Log success for debugging
          console.log('✅ External resource loaded:', url.hostname);
          return response;
        })
        .catch(error => {
          // Gracefully handle external resource failures
          console.warn('⚠️ External resource unavailable:', url.hostname, error.message);
          
          // For CSS files, return empty CSS instead of error
          if (event.request.destination === 'style') {
            return new Response('/* External stylesheet unavailable - app will use defaults */', {
              status: 200,
              headers: { 'Content-Type': 'text/css' }
            });
          }
          
          // For other external resources, return error response
          return new Response('External resource unavailable', { status: 503 });
        })
    );
  }
  
  // Cache-first strategy for local static assets (GET only)
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('📦 Serving from cache:', url.pathname);
          return response;
        }
        
        return fetch(event.request).then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) return response;
          
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone).catch(err => {
                console.warn('⚠️ Failed to cache response:', url.pathname, err.message);
              });
            })
            .catch(err => {
              console.warn('⚠️ Cache open failed:', err.message);
            });
          
          return response;
        }).catch(error => {
          console.warn('⚠️ Fetch failed for:', url.pathname);
          // Try to return cached version as fallback
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log('📦 Serving fallback from cache:', url.pathname);
                return cachedResponse;
              }
              return new Response('Offline - resource not cached', { status: 503 });
            })
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
