"use client";

import { useEffect } from "react";

/**
 * Unregisters any existing service worker on auth pages.
 * The SW controls all pages with scope "/", so even though we don't
 * register it on auth pages, a previously registered SW still intercepts
 * requests until the page reloads.
 *
 * If a SW is found and unregistered, the page reloads once so the SW
 * is fully detached. A sessionStorage flag prevents reload loops.
 */
export default function UnregisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const reloadFlag = sessionStorage.getItem("waqt-sw-cleared");

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        if (registrations.length === 0) return;

        // Unregister all SWs
        return Promise.all(
          registrations.map((r) => r.unregister().catch(() => {}))
        ).then(() => {
          // Clear all caches
          if ("caches" in window) {
            caches.keys().then((names) => {
              Promise.all(names.map((n) => caches.delete(n))).catch(() => {});
            });
          }

          // Reload once to fully detach the SW, but prevent loops
          if (!reloadFlag) {
            sessionStorage.setItem("waqt-sw-cleared", "1");
            window.location.reload();
          }
        });
      })
      .catch(() => {});

    // Clean up the flag after a moment so future visits can detect SWs
    if (reloadFlag) {
      setTimeout(() => sessionStorage.removeItem("waqt-sw-cleared"), 2000);
    }
  }, []);

  return null;
}
