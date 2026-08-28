"use client";

import { useEffect } from "react";
import { Target, RefreshCw } from "lucide-react";

/**
 * Route-level error boundary.
 * Catches errors thrown during render of any route segment
 * and shows a recovery screen instead of a blank white page.
 * Apple rejects apps that crash to a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging — no external analytics SDK
    console.error("Route error:", error);
  }, [error]);

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--color-paper-2)" }}
    >
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-error) 10%, transparent)",
        }}
      >
        <Target className="h-7 w-7" style={{ color: "var(--color-error)" }} />
      </div>
      <h1
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--color-ink)" }}
      >
        Something went wrong
      </h1>
      <p
        className="mb-6 max-w-sm text-sm leading-relaxed"
        style={{ color: "var(--color-ink-muted)" }}
      >
        An unexpected error occurred. Try again — your data is safe.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
          minHeight: 44,
        }}
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
