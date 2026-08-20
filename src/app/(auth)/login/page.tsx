"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  // ── Honeypot fields — hidden from humans, bots fill these ──
  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [honeypotCompany, setHoneypotCompany] = useState("");

  // ── Time-trap — record when the form rendered ──
  const renderedAtRef = useRef<number>(0);
  useEffect(() => { renderedAtRef.current = Date.now(); }, []);

  async function handleSubmit(e: React.FormEvent) {
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
          // Honeypots
          website: honeypotWebsite,
          company: honeypotCompany,
          // Time-trap
          renderedAt: renderedAtRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || "Invalid email or password.");
        setPending(false);
        return;
      }

      router.push("/");
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
        Welcome back
      </h1>
      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Log in to continue your prayer tracking.
      </p>

      {/* Honeypot fields — invisible to humans */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="login-website">Website (leave empty)</label>
        <input
          id="login-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotWebsite}
          onChange={(e) => setHoneypotWebsite(e.target.value)}
        />
        <label htmlFor="login-company">Company (leave empty)</label>
        <input
          id="login-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotCompany}
          onChange={(e) => setHoneypotCompany(e.target.value)}
        />
      </div>

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

      <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4" style={{ color: "var(--color-accent)" }}>
          Sign up
        </Link>
      </p>
    </form>
  );
}
