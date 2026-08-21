"use client";

import { useState, useEffect } from "react";
import { Link2, Copy, Check, Trash2, ExternalLink } from "lucide-react";

export default function ShareLinkCard() {
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/share/generate")
      .then((r) => r.json())
      .then((data) => {
        setEnabled(data.enabled);
        if (data.token) {
          setUrl(`${window.location.origin}/user/public/${data.token}`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/share/generate", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.token) {
        setEnabled(true);
        setUrl(`${window.location.origin}/user/public/${data.token}`);
      } else {
        setError(data.error || "Failed to generate link.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDisable() {
    setError(null);
    try {
      const res = await fetch("/api/share/generate", { method: "DELETE" });
      if (res.ok) {
        setEnabled(false);
        setUrl(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disable sharing.");
      }
    } catch {
      setError("Network error.");
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          Public calendar link
        </h3>
      </div>

      <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
        Share a read-only view of your calendar. Anyone with the link can see your schedule and prayer times — no editing, no account needed.
      </p>

      {enabled && url ? (
        <div className="flex flex-col gap-3">
          {/* The link */}
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
          >
            <span
              className="min-w-0 flex-1 truncate text-xs"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {url}
            </span>
            <button
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-paper-3)]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" style={{ color: "var(--color-success)" }} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
              style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-50"
              style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
            >
              <Link2 className="h-3 w-3" />
              {generating ? "Regenerating..." : "Regenerate"}
            </button>
            <button
              onClick={handleDisable}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-error)" }}
            >
              <Trash2 className="h-3 w-3" />
              Disable
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <Link2 className="h-4 w-4" />
          {generating ? "Creating link..." : "Create public link"}
        </button>
      )}

      {error && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-error)" }}>{error}</p>
      )}
    </div>
  );
}
