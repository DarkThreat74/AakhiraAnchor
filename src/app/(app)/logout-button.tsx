"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();

  const handleLogout = () => {
    // Clear SW API cache to prevent cross-user data leakage
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
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
