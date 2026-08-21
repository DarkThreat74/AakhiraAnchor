"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();

  const handleLogout = async () => {
    // Clear SW API cache to prevent cross-user data leakage
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
    }

    // Clear all caches (defensive — prevents any cached user data persisting)
    if ("caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {
        // ignore
      }
    }

    // Unregister service worker so next login starts fresh
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch {
        // ignore
      }
    }

    startTransition(() => logout());
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
