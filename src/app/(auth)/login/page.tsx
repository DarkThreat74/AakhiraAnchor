"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Mode = "login" | "forgot-email" | "forgot-reset" | "forgot-done";

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmedEmail, setConfirmedEmailState] = useState<string>("");

  // Time-trap timestamp — set on mount so bots that submit instantly are caught.
  // -1 = not mounted yet (treated as valid to avoid false positives).
  const renderedAtRef = useRef<number>(-1);
  useEffect(() => { renderedAtRef.current = Date.now(); }, []);

  // ── Login submit ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          renderedAt: renderedAtRef.current,
        }),
      });

      let data: { error?: string; ok?: boolean } = {};
      const text = await res.text();
      if (text) {
        try { data = JSON.parse(text); } catch { /* empty body */ }
      }

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        return;
      }

      // HARD NAVIGATION — full page load guarantees the browser sends
      // the new session cookie and avoids client-side routing issues.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/calendar/day";
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ── Forgot password: check email existence ──
  async function handleCheckEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", email, renderedAt: renderedAtRef.current }),
      });

      const data: { exists?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.exists) {
        // Stash the confirmed email so the reset step uses the same one
        setConfirmedEmailState(email);
        setMode("forgot-reset");
      } else {
        setError("No account found with that email.");
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ── Forgot password: set new password ──
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          email: confirmedEmail,
          password,
          confirm,
          renderedAt: renderedAtRef.current,
        }),
      });

      const data: { ok?: boolean; error?: string } = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setMode("forgot-done");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // ── Render ──
  if (mode === "forgot-done") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          Password updated
        </h1>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Your password has been changed. You can now log in with your new password.
        </p>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "var(--color-ink)",
            color: "var(--color-paper)",
          }}
        >
          Back to login
        </button>
      </div>
    );
  }

  if (mode === "forgot-email" || mode === "forgot-reset") {
    return (
      <form
        onSubmit={mode === "forgot-email" ? handleCheckEmail : handleResetPassword}
        className="flex flex-col gap-4"
      >
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {mode === "forgot-email" ? "Forgot password" : "Set a new password"}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {mode === "forgot-email"
            ? "Enter your email and we'll check if an account exists."
            : "Enter your new password below. Make it something you'll remember."}
        </p>

        {mode === "forgot-email" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
              style={{
                borderColor: "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
                color: "var(--color-ink)",
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                autoFocus
                minLength={8}
                className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                style={{
                  borderColor: "var(--color-paper-3)",
                  backgroundColor: "var(--color-paper)",
                  color: "var(--color-ink)",
                }}
              />
              <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                At least 8 characters, with one letter and one number.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                Confirm new password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                style={{
                  borderColor: "var(--color-paper-3)",
                  backgroundColor: "var(--color-paper)",
                  color: "var(--color-ink)",
                }}
              />
            </div>
          </>
        )}

        {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: "var(--color-ink)",
            color: "var(--color-paper)",
          }}
        >
          {pending
            ? mode === "forgot-email" ? "Checking..." : "Updating..."
            : mode === "forgot-email" ? "Continue" : "Update password"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className="text-sm font-medium underline underline-offset-4"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Back to login
        </button>
      </form>
    );
  }

  // ── Default: login form ──
  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
        Welcome back
      </h1>
      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Log in to continue your prayer tracking.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "var(--color-paper)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "var(--color-paper)",
            color: "var(--color-ink)",
          }}
        />
      </div>

      {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
        }}
      >
        {pending ? "Logging in..." : "Log in"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("forgot-email");
            setError(null);
          }}
          className="font-medium underline underline-offset-4"
          style={{ color: "var(--color-accent)" }}
        >
          Forgot password?
        </button>
        <p style={{ color: "var(--color-ink-muted)" }}>
          No account?{" "}
          <Link href="/signup" className="font-medium underline underline-offset-4" style={{ color: "var(--color-accent)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </form>
  );
}
