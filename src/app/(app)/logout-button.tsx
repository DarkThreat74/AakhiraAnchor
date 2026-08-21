"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);

    // 1. Clear the session cookie via API call (not server action — avoids SW intercept)
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore — we'll redirect anyway
    }

    // 2. Clear SW API cache to prevent cross-user data leakage
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
    }

    // 3. Clear all caches
    if ("caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {
        // ignore
      }
    }

    // 4. Unregister service worker
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // ignore
      }
    }

    // 5. Clear storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }

    // 6. Hard redirect to login — use window.location for a full page load
    //    that bypasses any SW that might still be controlling the page
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-60 disabled:opacity-50"
      style={{ color: "var(--color-ink-muted)" }}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden lg:inline">Log out</span>
    </button>
  );
}
