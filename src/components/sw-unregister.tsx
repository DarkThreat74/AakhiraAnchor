"use client";

import { useEffect } from "react";

/**
 * Unregisters any existing service worker on public pages.
 * The SW controls all pages with scope "/", so even though we don't
 * register it on public pages, a previously registered SW still intercepts
 * requests until it's unregistered and the page reloads.
 *
 * This component is used on: landing page, login, signup, admin login.
 */
export default function UnregisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function cleanup() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled || registrations.length === 0) return;

        // Unregister all SWs
        await Promise.all(
          registrations.map((r) => r.unregister().catch(() => {}))
        );

        // Clear all caches
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }

        // Reload once to fully detach the SW — use a flag to prevent loops
        // but use a SHORT-LIVED flag that clears quickly
        const flagKey = "waqt-sw-reloaded";
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, "1");
          window.location.reload();
        } else {
          // Already reloaded once — clear the flag so next visit can reload again
          sessionStorage.removeItem(flagKey);
        }
      } catch {
        // ignore
      }
    }

    cleanup();

    return () => { cancelled = true; };
  }, []);

  return null;
}
