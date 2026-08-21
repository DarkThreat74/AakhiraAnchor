"use client";

import { useEffect, useState } from "react";

/**
 * Unregisters any existing service worker on public pages.
 * The SW controls all pages with scope "/", so even though we don't
 * register it on public pages, a previously registered SW still intercepts
 * requests until it's unregistered and the page reloads.
 *
 * This component BLOCKS rendering of children until the SW check is complete.
 * This prevents the reload from interrupting form submission — if the user
 * starts filling out a form and the SW cleanup triggers a reload, the form
 * state would be lost. By blocking rendering, we ensure the user never sees
 * the form until the SW is fully cleared.
 *
 * This component is used on: landing page, login, signup, admin login.
 */
export default function UnregisterServiceWorker({ children }: { children: React.ReactNode }) {
  // Start as null (checking), then become true (ready) once SW cleanup is done.
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    // If no SW support, we're immediately ready — but defer the setState
    // to a microtask to avoid the synchronous-in-effect lint rule.
    if (!("serviceWorker" in navigator)) {
      const id = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(id);
    }

    let cancelled = false;

    async function cleanup() {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (cancelled) return;

        if (registrations.length === 0) {
          setReady(true);
          return;
        }

        // Unregister all SWs
        await Promise.all(
          registrations.map((r) => r.unregister().catch(() => {}))
        );

        // Clear all caches
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }

        if (cancelled) return;

        // Reload once to fully detach the SW — use a flag to prevent loops
        const flagKey = "waqt-sw-reloaded";
        if (!sessionStorage.getItem(flagKey)) {
          sessionStorage.setItem(flagKey, "1");
          window.location.reload();
        } else {
          // Already reloaded once — clear the flag and proceed
          sessionStorage.removeItem(flagKey);
          setReady(true);
        }
      } catch {
        // If anything fails, just render — the SW might not be interfering
        setReady(true);
      }
    }

    cleanup();

    return () => { cancelled = true; };
  }, []);

  // Don't render children until SW check is complete
  if (ready === null) {
    return <div style={{ minHeight: "100vh", backgroundColor: "var(--color-paper)" }} />;
  }

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
