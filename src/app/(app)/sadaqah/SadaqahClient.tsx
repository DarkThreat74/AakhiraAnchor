"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Trash2, Plus, TrendingUp } from "lucide-react";

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
    // Defer to avoid cascading renders (react-hooks/set-state-in-effect)
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
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading sadaqah…</p>
        </div>
      </div>
    );
  }

  const currency = data?.currency || "USD";

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Sadaqah Tracker</h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Track your charitable giving
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
          {showForm ? "Cancel" : (<><Plus className="h-4 w-4" /> Log Sadaqah</>)}
        </button>
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
            {submitting ? "Saving…" : "Log Sadaqah"}
          </button>
        </form>
      )}

      {/* ── Summary cards ── */}
      {data && (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <div className="rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
            <div className="mb-1.5 flex items-center gap-1.5" style={{ color: "var(--color-accent)" }}>
              <TrendingUp className="h-4 w-4" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Total Given</span>
            </div>
            <div className="text-lg font-bold tabular-nums sm:text-xl" style={{ color: "var(--color-ink)" }}>
              {formatCurrency(data.grandTotal, currency)}
            </div>
          </div>
          {CATEGORIES.map((cat) => {
            const s = data.summary[cat.value];
            if (!s || s.count === 0) return null;
            return (
              <div key={cat.value} className="rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
                <div className="mb-1.5 flex items-center gap-1.5" style={{ color: cat.color }}>
                  <Heart className="h-4 w-4" />
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
                  style={{ color: "var(--color-ink-muted)", minHeight: 36, minWidth: 36 }}
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <Heart className="h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            No sadaqah logged yet. Tap &ldquo;Log Sadaqah&rdquo; to start tracking your charitable giving.
          </p>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
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
