"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Plus, TrendingUp, Eye, EyeOff } from "lucide-react";

interface SadaqahLog {
  id: string;
  amount: string;
  currency: string;
  category: string;
  note: string | null;
  date: string;
  createdAt: string;
}

interface SadaqahData {
  logs: SadaqahLog[];
  summary: Record<string, { count: number; total: number }>;
  grandTotal: number;
  currency: string;
}

const CATEGORIES = [
  { value: "sadaqah", label: "Sadaqah", color: "var(--color-accent)" },
  { value: "zakat", label: "Zakat", color: "var(--color-warmth)" },
  { value: "fidyah", label: "Fidyah", color: "var(--color-ink-soft)" },
  { value: "charity", label: "General Charity", color: "var(--color-success)" },
] as const;

function getCategoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.color || "var(--color-accent)";
}

function getCategoryLabel(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.label || cat;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatCardNumber(total: number): string {
  // Format the total as a pseudo card number for visual flair
  // Use the total to generate a stable "card number" feel
  const padded = Math.round(total * 100).toString().padStart(12, "0").slice(-12);
  return padded.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function SadaqahClient() {
  const [data, setData] = useState<SadaqahData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("sadaqah");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SadaqahLog | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sadaqah").catch(() => null);
      if (res?.ok) {
        const json = await res.json().catch(() => null);
        if (json) setData(json);
      }
    } catch {
      /* non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => void fetchData());
  }, [fetchData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sadaqah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, category, note: note.trim() || undefined, date }),
      });
      if (res.ok) {
        setAmount("");
        setNote("");
        setCategory("sadaqah");
        setDate(todayStr());
        setShowForm(false);
        await fetchData();
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Failed to log sadaqah.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }, [amount, category, note, date, fetchData]);

  const handleDelete = useCallback(async (log: SadaqahLog) => {
    try {
      const res = await fetch(`/api/sadaqah?id=${log.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteConfirm(null);
        await fetchData();
      }
    } catch {
      /* non-critical */
    }
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading your Akhirah Card…</p>
        </div>
      </div>
    );
  }

  const currency = data?.currency || "USD";
  const grandTotal = data?.grandTotal ?? 0;
  const entryCount = data?.logs.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Akhirah Card</h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Your investment in the hereafter
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
          style={{
            borderColor: showForm ? "var(--color-paper-3)" : "var(--color-accent)",
            color: showForm ? "var(--color-ink-soft)" : "var(--color-accent)",
            backgroundColor: showForm ? "var(--color-paper-2)" : "color-mix(in oklab, var(--color-accent) 8%, transparent)",
            minHeight: 40,
          }}
        >
          {showForm ? "Cancel" : (<><Plus className="h-4 w-4" /> Add</>)}
        </button>
      </div>

      {/* ── The Akhirah Card (credit card design) ── */}
      <div className="mb-6" style={{ perspective: "1000px" }}>
        <div
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5"
          style={{
            aspectRatio: "1.586 / 1",
            maxWidth: "320px",
            margin: "0 auto",
            background: "linear-gradient(135deg, var(--color-ink) 0%, color-mix(in oklab, var(--color-ink) 85%, var(--color-accent)) 100%)",
            color: "var(--color-paper)",
            boxShadow: "0 12px 40px -12px color-mix(in oklab, var(--color-ink) 50%, transparent), inset 0 1px 0 color-mix(in oklab, var(--color-paper) 15%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-paper) 12%, transparent)",
          }}
        >
          {/* Sheen effect */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(circle at 20% 0%, color-mix(in oklab, var(--color-paper) 18%, transparent), transparent 50%)",
            }}
          />

          {/* Top row: card label + balance toggle */}
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] font-medium uppercase tracking-[0.15em] sm:text-[10px]" style={{ color: "color-mix(in oklab, var(--color-paper) 65%, transparent)" }}>
                Akhirah Card
              </p>
              <p className="mt-0.5 text-[8px] uppercase tracking-wide sm:text-[9px]" style={{ color: "color-mix(in oklab, var(--color-paper) 45%, transparent)" }}>
                Investment in the Hereafter
              </p>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="rounded-md p-1 transition-colors"
              style={{ color: "color-mix(in oklab, var(--color-paper) 60%, transparent)" }}
              aria-label={showBalance ? "Hide balance" : "Show balance"}
            >
              {showBalance ? <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>
          </div>

          {/* Chip */}
          <div
            className="relative mt-2 h-5 w-8 rounded-md sm:mt-3 sm:h-6 sm:w-9"
            style={{
              background: "linear-gradient(135deg, #d4a843, #f5c842, #b8860b)",
              boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--color-paper) 25%, transparent)",
            }}
          >
            <div className="absolute inset-1 rounded-sm" style={{ border: "0.5px solid color-mix(in oklab, #000 20%, transparent)" }} />
          </div>

          {/* Balance (the "card number" position) */}
          <div className="relative mt-2 sm:mt-3">
            {showBalance ? (
              <p className="text-lg font-bold tabular-nums sm:text-xl" style={{ letterSpacing: "0.02em" }}>
                {formatCurrency(grandTotal, currency)}
              </p>
            ) : (
              <p className="text-lg font-bold tabular-nums sm:text-xl" style={{ letterSpacing: "0.15em" }}>
                •••• ••••
              </p>
            )}
            <p className="mt-0.5 text-[9px] uppercase tracking-wide sm:text-[10px]" style={{ color: "color-mix(in oklab, var(--color-paper) 50%, transparent)" }}>
              Total invested in akhirah
            </p>
          </div>

          {/* Bottom row: entry count + card number */}
          <div className="relative mt-auto flex items-end justify-between pt-2 sm:pt-3">
            <div>
              <p className="text-[8px] uppercase tracking-wide sm:text-[9px]" style={{ color: "color-mix(in oklab, var(--color-paper) 45%, transparent)" }}>
                Entries
              </p>
              <p className="text-xs font-semibold tabular-nums sm:text-sm">{entryCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wide sm:text-[9px]" style={{ color: "color-mix(in oklab, var(--color-paper) 45%, transparent)" }}>
                Card No.
              </p>
              <p className="font-mono text-[10px] tabular-nums sm:text-[11px]" style={{ color: "color-mix(in oklab, var(--color-paper) 70%, transparent)" }}>
                {showBalance ? formatCardNumber(grandTotal) : "•••• •••• •••• ••••"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add form ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-2xl border p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "color-mix(in oklab, var(--color-error) 10%, transparent)", color: "var(--color-error)" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: category === cat.value ? cat.color : "var(--color-paper-3)",
                    color: category === cat.value ? cat.color : "var(--color-ink-muted)",
                    backgroundColor: category === cat.value ? `color-mix(in oklab, ${cat.color} 10%, transparent)` : "transparent",
                    minHeight: 36,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was it for?"
              maxLength={500}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-paper)", minHeight: 44 }}
          >
            {submitting ? "Saving…" : "Add to Akhirah Card"}
          </button>
        </form>
      )}

      {/* ── Category breakdown ── */}
      {data && entryCount > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {CATEGORIES.map((cat) => {
            const s = data.summary[cat.value];
            if (!s || s.count === 0) return null;
            return (
              <div key={cat.value} className="rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
                <div className="mb-1.5 flex items-center gap-1.5" style={{ color: cat.color }}>
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">{cat.label}</span>
                </div>
                <div className="text-lg font-bold tabular-nums sm:text-xl" style={{ color: "var(--color-ink)" }}>
                  {formatCurrency(s.total, currency)}
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>{s.count} {s.count === 1 ? "entry" : "entries"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Log entries ── */}
      {data && data.logs.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>History</h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-paper-3)" }}>
            {data.logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(log.category) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-ink)" }}>
                      {formatCurrency(parseFloat(log.amount), log.currency)}
                    </span>
                    <span className="text-xs" style={{ color: getCategoryColor(log.category) }}>
                      {getCategoryLabel(log.category)}
                    </span>
                  </div>
                  {log.note && (
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>{log.note}</p>
                  )}
                  <p className="mt-0.5 text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
                    {new Date(log.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(log)}
                  className="shrink-0 rounded-lg p-2 transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ color: "var(--color-ink-muted)", minHeight: 44, minWidth: 44 }}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            No entries yet. Tap &ldquo;Add&rdquo; to start investing in your akhirah.
          </p>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
          style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 40%, transparent)" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete entry"
            className="w-full max-w-xs rounded-2xl border p-5 text-center"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Delete entry?</h3>
            <p className="mt-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {formatCurrency(parseFloat(deleteConfirm.amount), deleteConfirm.currency)} · {getCategoryLabel(deleteConfirm.category)}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", backgroundColor: "var(--color-paper-2)", minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors"
                style={{ backgroundColor: "var(--color-error)", color: "var(--color-paper)", minHeight: 44 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
