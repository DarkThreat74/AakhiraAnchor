"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);

    // Clear the session cookie via API call
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore — we'll redirect anyway
    }

    // Hard redirect to login — full page load
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
