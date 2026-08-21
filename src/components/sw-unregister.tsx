"use client";

import { useEffect } from "react";

/**
 * Unregisters any existing service worker on auth pages.
 * The SW controls all pages with scope "/", so even though we don't
 * register it on auth pages, a previously registered SW still intercepts
 * requests. This component ensures auth pages run without SW interference.
 */
export default function UnregisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      });
    }
  }, []);

  return null;
}
