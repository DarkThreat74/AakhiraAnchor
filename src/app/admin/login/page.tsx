"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import UnregisterServiceWorker from "@/components/sw-unregister";

export default function AdminLoginPage() {
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
      const res = await fetch("/api/admin/auth", {
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

      // Safely parse JSON — response might be empty if the server crashes
      let data: { error?: string; ok?: boolean } = {};
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response is HTML or empty — not JSON
          setError(`Server returned an unexpected response (status ${res.status}). Check that environment variables are set on Vercel.`);
          setPending(false);
          return;
        }
      }

      if (!res.ok) {
        setError(data.error || `Request failed with status ${res.status}.`);
        setPending(false);
        return;
      }

      router.push("/admin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Connection failed: ${msg}. Try refreshing the page.`);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <UnregisterServiceWorker />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--color-paper-3)" }}
          >
            <Lock className="h-5 w-5" style={{ color: "var(--color-ink)" }} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            Admin Portal
          </h1>
          <p className="text-sm text-center" style={{ color: "var(--color-ink-muted)" }}>
            Restricted access. Authorized personnel only.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Honeypot fields — invisible to humans */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="admin-website">Website (leave empty)</label>
            <input
              id="admin-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypotWebsite}
              onChange={(e) => setHoneypotWebsite(e.target.value)}
            />
            <label htmlFor="admin-company">Company (leave empty)</label>
            <input
              id="admin-company"
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
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
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
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
            />
          </div>

          {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            {pending ? "Verifying..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
