/**
 * Waqt Service Worker
 * 
 * Strategy:
 * - Precache the app shell on install
 * - Network-first for navigation requests (always get fresh HTML)
 * - Cache-first for static assets (_next/static, images, fonts)
 * - Stale-while-revalidate for API GET requests (events, prayer times)
 * - Offline event writes: store in IndexedDB, sync when back online
 * - On update: skip waiting, notify client, client auto-reloads + clears old caches
 * 
 * The "no crash on update" rule:
 * - New SW installs in parallel (doesn't kill the old one)
 * - Old caches are deleted on activate (only after new SW takes control)
 * - Client is notified via postMessage, then does a hard reload
 * 
 * Offline event support:
 * - POST/PUT/DELETE to /api/events while offline → stored in IndexedDB outbox
 * - 'sync' event (Background Sync API) → replay outbox when online
 * - Fallback: replay on 'online' event from client
 */

const CACHE_VERSION = "waqt-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

// App shell — the minimal set of files for offline boot
const PRECACHE_URLS = [
  "/",
  "/login",
  "/signup",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
];

// ─── IndexedDB helpers for offline event outbox ───
const DB_NAME = "waqt-offline";
const DB_VERSION = 1;
const OUTBOX_STORE = "event-outbox";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addToOutbox(operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.add({ ...operation, timestamp: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOutbox() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readonly");
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeFromOutbox(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    const store = tx.objectStore(OUTBOX_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Sync offline outbox ───
async function syncOutbox() {
  const outbox = await getOutbox();
  if (outbox.length === 0) return;

  for (const item of outbox) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers || { "Content-Type": "application/json" },
        body: item.body ? JSON.stringify(item.body) : undefined,
        credentials: "include",
      });

      if (res.ok) {
        await removeFromOutbox(item.id);
        // Notify client that an event was synced
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.postMessage({ type: "EVENT_SYNCED", operation: item }));
      }
    } catch {
      // Still offline — stop trying, will retry on next sync
      break;
    }
  }
}

// ─── Install: precache app shell ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // If precache fails (e.g. offline), still install
      })
  );
});

// ─── Activate: clear old caches, claim clients ───
self.addEventListener("activate", (event) => {
  const validCaches = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !validCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Try to sync any pending offline events
        syncOutbox();
      })
      .then(() => {
        // Notify all clients that a new SW is active
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "SW_UPDATED" });
          });
        });
      })
  );
});

// ─── Background Sync — replay offline outbox ───
self.addEventListener("sync", (event) => {
  if (event.tag === "waqt-event-sync") {
    event.waitUntil(syncOutbox());
  }
});

// ─── Fetch: route by request type ───
self.addEventListener("fetch", (event) => {
  const { request } = event;

  const url = new URL(request.url);

  // ── Handle event writes (POST/PATCH/DELETE) ──
  if (
    request.method !== "GET" &&
    url.pathname.startsWith("/api/events")
  ) {
    // Clone the request body before consuming it
    const bodyPromise = request.clone().json().catch(() => null);

    event.respondWith(
      (async () => {
        try {
          // Try online first
          const response = await fetch(request);
          if (response.ok) return response;

          // Non-ok response — return it (validation error etc)
          return response;
        } catch {
          // Offline — store in outbox for later sync
          const body = await bodyPromise;
          await addToOutbox({
            method: request.method,
            url: request.url,
            body: body,
            headers: { "Content-Type": "application/json" },
          });

          // Notify client that event was queued offline
          const clients = await self.clients.matchAll({ type: "window" });
          clients.forEach((c) =>
            c.postMessage({
              type: "EVENT_QUEUED_OFFLINE",
              method: request.method,
              body: body,
            })
          );

          // Register background sync if supported
          if ("sync" in self.registration) {
            self.registration.sync.register("waqt-event-sync");
          }

          // Return a synthetic success response
          return new Response(
            JSON.stringify({ ok: true, offline: true, message: "Saved offline. Will sync when online." }),
            { status: 202, headers: { "Content-Type": "application/json" } }
          );
        }
      })()
    );
    return;
  }

  // Only handle GET requests beyond this point
  if (request.method !== "GET") return;

  // Don't intercept auth/captcha/admin — always need fresh
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/admin") || url.pathname.startsWith("/admin")) return;

  // ── Navigation requests: network-first ──
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then(
            (cached) =>
              cached ||
              caches.match("/") ||
              new Response("You are offline.", {
                status: 503,
                headers: { "Content-Type": "text/plain" },
              })
          );
        })
    );
    return;
  }

  // ── API GET requests (events, prayer-times): stale-while-revalidate ──
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches.open(API_CACHE).then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ── Static assets: cache-first ──
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Everything else: stale-while-revalidate ──
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ─── Message handler ───
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "SYNC_OUTBOX") {
    syncOutbox();
  }
  if (event.data && event.data.type === "CLEAR_API_CACHE") {
    // Clear API cache to prevent cross-user data leakage
    caches.delete(API_CACHE).catch(() => {});
  }
});

// ─── Push notifications ───
self.addEventListener("push", (event) => {
  let data = { title: "Waqt", body: "Time to pray" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "Waqt", body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    tag: data.tag || "waqt-notification",
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification click ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus any existing app window and navigate it
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(targetUrl);
          return;
        }
      }
      // Open new window if none exist
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
