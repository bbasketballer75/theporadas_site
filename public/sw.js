const CACHE_NAME = 'poradas-wedding-v1';
const STATIC_CACHE = 'poradas-wedding-static-v1';
const DYNAMIC_CACHE = 'poradas-wedding-dynamic-v1';

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/apple-touch-icon.svg',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/designSystem.css',
  '/src/skipLinkFocus.ts'
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching critical resources');
        return cache.addAll(CRITICAL_RESOURCES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Handle different resource types
  if (isStaticAsset(url.pathname)) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(request));
  } else if (isApiRequest(url.pathname)) {
    // Network-first strategy for API requests
    event.respondWith(networkFirst(request));
  } else {
    // Stale-while-revalidate for HTML and other dynamic content
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Cache-first failed:', error);
    // Return offline fallback for critical resources
    if (request.url.includes('/manifest.json') || request.url.includes('icon')) {
      return caches.match('/manifest.json') || new Response('Offline', { status: 503 });
    }
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network-first failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback
    return new Response(JSON.stringify({ error: 'Offline', message: 'Content not available offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(pathname) {
  return /\.(css|js|png|jpg|jpeg|svg|ico|woff|woff2|ttf|eot)$/.test(pathname) ||
         pathname.includes('/assets/') ||
         pathname.includes('/icon') ||
         pathname.includes('/manifest.json');
}

function isApiRequest(pathname) {
  return pathname.includes('/api/') ||
         pathname.includes('firestore.googleapis.com') ||
         pathname.includes('firebase');
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending offline actions here
  console.log('[Service Worker] Performing background sync');
}

// Handle push notifications (if needed in future)
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});