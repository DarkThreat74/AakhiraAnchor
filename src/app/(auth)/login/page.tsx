"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Fingerprint, Loader2 } from "lucide-react";
import { getHashedFingerprint } from "@/lib/auth/fingerprint";
import { useUISFX } from "@/components/uisfx-provider";

type Mode = "login" | "forgot-email" | "forgot-reset" | "forgot-done";

export default function LoginForm() {
  const { play } = useUISFX();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmedEmail, setConfirmedEmailState] = useState<string>("");

  // Trusted device state
  const [fingerprintHash, setFingerprintHash] = useState<string | null>(null);
  const [trustedDevice, setTrustedDevice] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(false);
  const [usePasswordInstead, setUsePasswordInstead] = useState(false);

  // Time-trap timestamp — set on mount so bots that submit instantly are caught.
  // -1 = not mounted yet (treated as valid to avoid false positives).
  const renderedAtRef = useRef<number>(-1);
  useEffect(() => { renderedAtRef.current = Date.now(); }, []);

  // ── Generate fingerprint on mount (non-blocking) ──
  useEffect(() => {
    getHashedFingerprint()
      .then(setFingerprintHash)
      .catch(() => {});
  }, []);

  // ── Check if this device is trusted for the entered email ──
  const checkTrustedDevice = useCallback(async (email: string) => {
    if (!fingerprintHash || !email) return;
    setCheckingDevice(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/auth/check-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fingerprintHash }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({ trusted: false }));
      setTrustedDevice(!!data.trusted);
    } catch {
      setTrustedDevice(false);
    } finally {
      clearTimeout(timeoutId);
      setCheckingDevice(false);
    }
  }, [fingerprintHash]);

  // ── Trusted device login (no password) ──
  async function handleTrustedLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fingerprintHash: fingerprintHash || undefined,
          renderedAt: renderedAtRef.current,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed. Use your password instead.");
        setTrustedDevice(false);
        play("error");
        return;
      }

      play("success");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/calendar/day";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
      play("error");
    } finally {
      clearTimeout(timeoutId);
      setPending(false);
    }
  }

  // ── Login submit (password mode) ──
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    // AbortController timeout — prevents the button from getting stuck if server is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          fingerprintHash: fingerprintHash || undefined,
          renderedAt: renderedAtRef.current,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: { error?: string; ok?: boolean; trustedDevice?: boolean } = {};
      const text = await res.text();
      if (text) {
        try { data = JSON.parse(text); } catch { /* empty body */ }
      }

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        play("error");
        return;
      }

      play("success");
      // HARD NAVIGATION — full page load guarantees the browser sends
      // the new session cookie and avoids client-side routing issues.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/calendar/day";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
      play("error");
    } finally {
      clearTimeout(timeoutId);
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", email, renderedAt: renderedAtRef.current }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: { exists?: boolean; error?: string } = await res.json().catch(() => ({}));

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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      clearTimeout(timeoutId);
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setMode("forgot-done");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError("Network error. Check your connection and try again.");
      }
    } finally {
      clearTimeout(timeoutId);
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
  // When trustedDevice is true, we use a one-click login form (no password field).
  // When false or still checking, we show the normal email+password form.
  const showTrustedLogin = trustedDevice && !usePasswordInstead;

  return (
    <form onSubmit={showTrustedLogin ? handleTrustedLogin : handleLogin} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
        Welcome back
      </h1>
      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        {showTrustedLogin
          ? "This device is trusted. Sign in instantly — no password needed."
          : "Log in to continue your prayer tracking."}
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
          onBlur={(e) => {
            const email = e.target.value.trim().toLowerCase();
            if (email && fingerprintHash) {
              checkTrustedDevice(email);
            }
          }}
          className="rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "var(--color-paper)",
            color: "var(--color-ink)",
          }}
        />
        {checkingDevice && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Checking trusted device…</span>
          </div>
        )}
      </div>

      {/* Password field — hidden when trusted device login is active */}
      {!showTrustedLogin && (
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
      )}

      {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{
          backgroundColor: "var(--color-ink)",
          color: "var(--color-paper)",
        }}
      >
        {showTrustedLogin && <Fingerprint className="h-4 w-4" />}
        {pending
          ? "Logging in..."
          : showTrustedLogin
            ? "Sign in with this device"
            : "Log in"}
      </button>

      {/* Switch between trusted device and password login */}
      {showTrustedLogin && (
        <button
          type="button"
          onClick={() => {
            setUsePasswordInstead(true);
            setTrustedDevice(false);
            setError(null);
          }}
          className="text-center text-xs font-medium underline underline-offset-4"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Use password instead
        </button>
      )}

      {/* Trusted device indicator */}
      {fingerprintHash && !showTrustedLogin && !checkingDevice && (
        <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          <Fingerprint className="h-3.5 w-3.5" />
          <span>Trusted device login available — enter your email to check.</span>
        </div>
      )}

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
