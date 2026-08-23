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

const CACHE_VERSION = "waqt-v9";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const API_CACHE = `${CACHE_VERSION}-api`;

// App shell — the minimal set of files for offline boot
// NOTE: Public pages (/, /login, /signup) are NOT precached — the SW only
// controls authenticated app pages. Caching auth pages causes stale login
// forms and broken navigation.
const PRECACHE_URLS = [
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

  let syncedCount = 0;
  let failed = false;

  for (const item of outbox) {
    if (failed) break;
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers || { "Content-Type": "application/json" },
        body: item.body ? JSON.stringify(item.body) : undefined,
        credentials: "include",
      });

      if (res.ok) {
        await removeFromOutbox(item.id);
        syncedCount++;
      } else {
        // Server rejected it (e.g. validation error) — remove from outbox
        // to avoid retrying forever, but notify client
        await removeFromOutbox(item.id);
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.postMessage({
          type: "EVENT_SYNC_FAILED",
          operation: item,
          status: res.status,
        }));
      }
    } catch {
      // Still offline — stop trying, will retry on next sync
      failed = true;
      break;
    }
  }

  // Notify client that sync is complete so it can refetch fresh data
  if (syncedCount > 0) {
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.postMessage({ type: "EVENT_SYNCED", count: syncedCount }));
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
          const tempId = "offline-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
          await addToOutbox({
            method: request.method,
            url: request.url,
            body: body,
            headers: { "Content-Type": "application/json" },
            tempId: tempId,
          });

          // Notify client that event was queued offline
          const clients = await self.clients.matchAll({ type: "window" });
          clients.forEach((c) =>
            c.postMessage({
              type: "EVENT_QUEUED_OFFLINE",
              method: request.method,
              body: body,
              tempId: tempId,
            })
          );

          // Register background sync if supported
          if ("sync" in self.registration) {
            self.registration.sync.register("waqt-event-sync");
          }

          // Return a synthetic success response with the temp ID
          // For POST, include enough data for the client to render the event
          const responseData: Record<string, unknown> = {
            ok: true,
            offline: true,
            tempId: tempId,
            message: "Saved offline. Will sync when online.",
          };

          // For POST, echo back the event data with the temp ID so the client
          // can display it immediately on the calendar
          if (request.method === "POST" && body) {
            responseData.id = tempId;
            responseData.title = body.title || "Untitled";
            responseData.startAt = body.startAt;
            responseData.endAt = body.endAt;
            responseData.type = body.type || "block";
            responseData.color = body.color || null;
            responseData._pending = true;
          }

          return new Response(
            JSON.stringify(responseData),
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

  // Don't intercept notification endpoints — always need fresh
  if (url.pathname.startsWith("/api/notifications")) return;

  // Don't intercept public calendar API — always need fresh
  if (url.pathname.startsWith("/api/public/")) return;

  // Don't intercept share management API
  if (url.pathname.startsWith("/api/share/")) return;

  // ── Navigation requests: stale-while-revalidate ──
  // Serve cached HTML instantly (if available), then fetch fresh HTML in the
  // background and update the cache. This makes tab switches instant.
  // Offline: serve cached page, then fallback to app shell.
  if (request.mode === "navigate") {
    const pathname = url.pathname;
    // Public pages — don't intercept, let the browser handle normally
    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/user/public/") ||
      pathname.startsWith("/api/")
    ) {
      return; // Let the browser handle it directly — no SW interference
    }

    event.respondWith(
      caches.match(request).then((cached) => {
        // Fetch fresh version in background to update cache
        const fetchPromise = fetch(request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
            return response;
          })
          .catch(() => cached); // Network failed — rely on cache

        // Return cached immediately if available, otherwise wait for network
        return cached || fetchPromise || caches.match("/calendar/day").then(
          (dayCached) => dayCached || new Response(
            "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Waqt — Offline</title><style>body{font-family:system-ui,sans-serif;background:#f5f0e8;color:#1a1815;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}h1{font-size:18px;margin-bottom:8px}p{font-size:14px;opacity:0.7}</style></head><body><div><h1>You're offline</h1><p>Your calendar will load from cache once the app reconnects. Try reopening the app.</p></div></body></html>",
            { status: 200, headers: { "Content-Type": "text/html" } }
          )
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
