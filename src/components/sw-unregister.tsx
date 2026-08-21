"use client";

import { useEffect } from "react";

/**
 * Unregisters any existing service worker on public pages.
 * The SW controls all pages with scope "/", so even though we don't
 * register it on public pages, a previously registered SW still intercepts
 * requests until it's unregistered.
 *
 * This component runs cleanup in the BACKGROUND — it does NOT block page
 * rendering. The SW itself already skips public pages (see sw.js), so
 * even if the old SW is still registered for a moment, it won't interfere
 * with navigation. This component just ensures the SW gets cleaned up.
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
      } catch {
        // Ignore — SW cleanup is best-effort
      }
    }

    cleanup();

    return () => { cancelled = true; };
  }, []);

  return null;
}
