"use client";

import { useEffect, useState } from "react";

/**
 * Global offline indicator banner.
 * Shows a thin banner at the top of the main content area when the browser
 * is offline. Mounted once in the (app) layout so it appears on every page.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center justify-center px-4 py-1.5 text-center text-xs font-medium"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-warmth) 12%, var(--color-paper))",
        color: "var(--color-warmth)",
        borderBottom: "1px solid color-mix(in oklab, var(--color-warmth) 20%, transparent)",
      }}
      role="status"
      aria-live="polite"
    >
      You&apos;re offline — changes will sync when you reconnect.
    </div>
  );
}
