"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import UnregisterServiceWorker from "@/components/sw-unregister";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [honeypotCompany, setHoneypotCompany] = useState("");

  // Use -1 as sentinel (not 0, which triggers the server's time-trap bot check).
  // The useEffect sets the real timestamp after mount.
  const renderedAtRef = useRef<number>(-1);
  useEffect(() => { renderedAtRef.current = Date.now(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          website: honeypotWebsite,
          company: honeypotCompany,
          renderedAt: renderedAtRef.current,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data: { error?: string; ok?: boolean } = {};
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          setError(`Server returned an unexpected response (status ${res.status}). Check that environment variables are set on Vercel.`);
          return;
        }
      }

      if (!res.ok) {
        setError(data.error || `Request failed with status ${res.status}.`);
        return;
      }

      router.push("/admin");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Connection failed: ${msg}. Try refreshing the page.`);
      }
    } finally {
      clearTimeout(timeoutId);
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip" style={{ backgroundColor: "var(--color-paper-2)" }}>
      <UnregisterServiceWorker />
      {/* ── Left rail — brand mark + access note ── */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Brand mark */}
          <div className="mb-10 flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md"
              style={{ backgroundColor: "var(--color-ink)" }}
            >
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-paper)" }} />
            </div>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Waqt <span style={{ color: "var(--color-ink-muted)" }}>Admin</span>
            </span>
          </div>

          {/* Heading — left-aligned, not centered */}
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ color: "var(--color-ink)" }}
          >
            Restricted access
          </h1>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Authorized personnel only. Sign in with your admin credentials.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
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
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                className="rounded-md border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                style={{
                  borderColor: "var(--color-paper-3)",
                  backgroundColor: "var(--color-paper)",
                  color: "var(--color-ink)",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="rounded-md border px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
                style={{
                  borderColor: "var(--color-paper-3)",
                  backgroundColor: "var(--color-paper)",
                  color: "var(--color-ink)",
                }}
              />
            </div>

            {error && (
              <p
                className="rounded-md px-3 py-2 text-sm"
                style={{
                  color: "var(--color-error)",
                  backgroundColor: "color-mix(in oklab, var(--color-error) 8%, transparent)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-paper)",
              }}
            >
              {pending ? "Verifying..." : "Sign in"}
            </button>
          </form>

          {/* Back link */}
          <div className="mt-8 border-t pt-5" style={{ borderColor: "var(--color-paper-3)" }}>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
              style={{ color: "var(--color-ink-muted)" }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
