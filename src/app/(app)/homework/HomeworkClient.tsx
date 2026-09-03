"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Check, Trash2, X, Clock, AlertCircle, BookOpen, ChevronDown } from "lucide-react";
import { clearApiCache } from "@/lib/sw-helpers";
import { getOfflineDB } from "@/lib/offline/db";
import {
  syncHomeworkToCache,
  upsertHomeworkToCache,
  deleteHomeworkFromCache,
  syncClassesToCache,
  upsertClassToCache,
} from "@/lib/offline/cache-writers";

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  dueDate: string;
  dueTime: string | null;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  kind: "homework" | "test" | "project" | "quiz" | "reading" | "other";
  completedAt: Date | null;
}

interface ClassItem {
  id: string;
  name: string;
  color: string;
  archived: boolean;
}

const CLASS_COLORS = [
  "#c2410c", "#0e7490", "#b45309", "#15803d",
  "#be185d", "#7c2d12", "#166534", "#3730a3",
  "#a16207", "#9f1239",
];

const KIND_LABELS: Record<string, string> = {
  homework: "Homework",
  test: "Test",
  project: "Project",
  quiz: "Quiz",
  reading: "Reading",
  other: "Other",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--color-warmth)",
  medium: "var(--color-ink-muted)",
  low: "var(--color-accent)",
};

function todayStr(): string {
  return new Date().toLocaleDateString("en-CA");
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

function daysUntil(dueDate: string): number {
  const today = new Date(todayStr() + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdue(hw: HomeworkItem): boolean {
  if (hw.status === "completed") return false;
  const days = daysUntil(hw.dueDate);
  if (days < 0) return true;
  if (days === 0 && hw.dueTime) {
    const [h, m] = hw.dueTime.split(":").map(Number);
    const now = new Date();
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  }
  return false;
}

function formatDueLabel(hw: HomeworkItem): string {
  const days = daysUntil(hw.dueDate);
  if (hw.status === "completed") return "Completed";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) {
    if (hw.dueTime) {
      const [h, m] = hw.dueTime.split(":").map(Number);
      const hour = h % 12 || 12;
      const period = h < 12 ? "AM" : "PM";
      return `Today at ${hour}:${String(m).padStart(2, "0")} ${period}`;
    }
    return "Today";
  }
  if (days === 1) return "Tomorrow";
  if (days <= 6) return `In ${days} days`;
  const due = new Date(hw.dueDate + "T00:00:00");
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HomeworkClient({
  initialHomework,
  initialClasses,
}: {
  initialHomework: HomeworkItem[];
  initialClasses: ClassItem[];
}) {
  const [homework, setHomework] = useState<HomeworkItem[]>(initialHomework);
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Add form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(tomorrowStr());
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [kind, setKind] = useState<"homework" | "test" | "project" | "quiz" | "reading" | "other">("homework");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Class form state
  const [className, setClassName] = useState("");
  const [classColor, setClassColor] = useState(CLASS_COLORS[0]);
  const [savingClass, setSavingClass] = useState(false);

  const refreshHomework = useCallback(async () => {
    try {
      const res = await fetch("/api/homework");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHomework(data);
          syncHomeworkToCache(data);
        }
      }
    } catch {
      // non-critical — offline, cached data still showing
    }
  }, []);

  // ── Offline-first: load from IndexedDB on mount, then refresh from API ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Step 1: Load from IndexedDB first (instant if cached)
      try {
        const db = getOfflineDB();
        const [cachedHw, cachedClasses] = await Promise.all([
          db.homework.toArray(),
          db.classes.toArray(),
        ]);
        if (cancelled) return;
        if (cachedHw.length > 0) {
          setHomework(cachedHw.map((h) => ({
            id: h.id,
            title: h.title,
            description: h.description,
            classId: h.classId,
            dueDate: h.dueDate,
            dueTime: h.dueTime,
            priority: h.priority as HomeworkItem["priority"],
            status: h.status as HomeworkItem["status"],
            kind: h.kind as HomeworkItem["kind"],
            completedAt: h.completedAt ? new Date(h.completedAt) : null,
          })));
        }
        if (cachedClasses.length > 0) {
          setClasses(cachedClasses.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            archived: c.archived,
          })));
        }
      } catch {
        // IndexedDB not available — continue to API
      }

      // Step 2: Fetch from API in background (authoritative)
      try {
        const [hwRes, clsRes] = await Promise.all([
          fetch("/api/homework"),
          fetch("/api/classes"),
        ]);
        if (cancelled) return;
        if (hwRes.ok) {
          const hwData = await hwRes.json();
          if (Array.isArray(hwData)) {
            setHomework(hwData);
            syncHomeworkToCache(hwData);
          }
        }
        if (clsRes.ok) {
          const clsData = await clsRes.json();
          if (Array.isArray(clsData)) {
            setClasses(clsData);
            syncClassesToCache(clsData);
          }
        }
      } catch {
        // Offline — cached data is already showing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Listen for outbox sync events to refresh after offline writes ──
  useEffect(() => {
    function onSynced() {
      refreshHomework();
    }
    window.addEventListener("waqt:events-synced", onSynced);
    return () => window.removeEventListener("waqt:events-synced", onSynced);
  }, [refreshHomework]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setClassId(null);
    setDueDate(tomorrowStr());
    setDueTime("");
    setPriority("medium");
    setKind("homework");
    setError(null);
  }

  async function handleAddHomework() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || undefined,
          classId: classId || undefined,
          dueDate,
          dueTime: dueTime ? `${dueTime}:00` : undefined,
          priority,
          kind,
        }),
      });
      if (res.ok) {
        const newHw = await res.json();
        setHomework((prev) => [...prev, newHw].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
        upsertHomeworkToCache(newHw);
        clearApiCache();
        resetForm();
        setShowAddForm(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to add homework");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete(hw: HomeworkItem) {
    const newStatus: "pending" | "completed" = hw.status === "completed" ? "pending" : "completed";
    const updatedHw: HomeworkItem = { ...hw, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null };
    // Optimistic update
    setHomework((prev) => prev.map((h) => (h.id === hw.id ? updatedHw : h)));
    upsertHomeworkToCache(updatedHw);
    try {
      await fetch(`/api/homework/${hw.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      clearApiCache();
    } catch {
      // Revert on failure
      setHomework((prev) =>
        prev.map((h) => (h.id === hw.id ? { ...h, status: hw.status, completedAt: hw.completedAt } : h)),
      );
      upsertHomeworkToCache({ ...hw });
    }
  }

  async function handleDelete(id: string) {
    setHomework((prev) => prev.filter((h) => h.id !== id));
    deleteHomeworkFromCache(id);
    try {
      await fetch(`/api/homework/${id}`, { method: "DELETE" });
      clearApiCache();
    } catch {
      // Re-fetch on failure
      refreshHomework();
    }
  }

  async function handleAddClass() {
    const trimmed = className.trim();
    if (!trimmed) return;
    setSavingClass(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color: classColor }),
      });
      if (res.ok) {
        const newClass = await res.json();
        setClasses((prev) => [...prev, newClass]);
        upsertClassToCache(newClass);
        setClassName("");
        setClassColor(CLASS_COLORS[classes.length % CLASS_COLORS.length]);
        setShowAddClass(false);
      }
    } catch {
      // non-critical
    } finally {
      setSavingClass(false);
    }
  }

  // Group homework into urgency buckets
  const filtered = homework.filter((h) => {
    if (filterClassId && h.classId !== filterClassId) return false;
    return true;
  });

  const pending = filtered.filter((h) => h.status === "pending");
  const completed = filtered.filter((h) => h.status === "completed");

  const overdue = pending.filter(isOverdue);
  const today = pending.filter((h) => daysUntil(h.dueDate) === 0 && !isOverdue(h));
  const tomorrow = pending.filter((h) => daysUntil(h.dueDate) === 1);
  const thisWeek = pending.filter((h) => {
    const d = daysUntil(h.dueDate);
    return d >= 2 && d <= 6;
  });
  const later = pending.filter((h) => daysUntil(h.dueDate) >= 7);

  function getClassInfo(id: string | null): ClassItem | null {
    if (!id) return null;
    return classes.find((c) => c.id === id) || null;
  }

  function renderHomeworkCard(hw: HomeworkItem) {
    const cls = getClassInfo(hw.classId);
    const overdue_ = isOverdue(hw);
    return (
      <div
        key={hw.id}
        className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-[var(--color-paper-2)]"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: overdue_ ? "color-mix(in oklab, var(--color-error) 4%, transparent)" : "transparent",
        }}
      >
        {/* Checkbox */}
        <button
          onClick={() => handleToggleComplete(hw)}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          style={{
            borderColor: hw.status === "completed" ? "var(--color-success)" : "var(--color-paper-3)",
            backgroundColor: hw.status === "completed" ? "var(--color-success)" : "transparent",
          }}
          aria-label={hw.status === "completed" ? "Mark as pending" : "Mark as complete"}
        >
          {hw.status === "completed" && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-paper)" }} />}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-medium leading-snug"
              style={{
                color: hw.status === "completed" ? "var(--color-ink-muted)" : "var(--color-ink)",
                textDecoration: hw.status === "completed" ? "line-through" : "none",
              }}
            >
              {hw.title}
            </h3>
            <button
              onClick={() => handleDelete(hw.id)}
              className="shrink-0 rounded-lg p-1 transition-colors hover:bg-[var(--color-paper-2)]"
              style={{ color: "var(--color-ink-muted)" }}
              aria-label="Delete homework"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {cls && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${cls.color} 12%, var(--color-paper))`,
                  color: cls.color,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cls.color }} />
                {cls.name}
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: "var(--color-paper-2)",
                color: overdue_ ? "var(--color-error)" : "var(--color-ink-muted)",
              }}
            >
              <Clock className="h-2.5 w-2.5" />
              {formatDueLabel(hw)}
            </span>
            {hw.kind !== "homework" && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-muted)" }}
              >
                {KIND_LABELS[hw.kind]}
              </span>
            )}
            {hw.priority === "high" && hw.status === "pending" && (
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[hw.priority] }}
                title="High priority"
              />
            )}
          </div>

          {hw.description && (
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
              {hw.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderSection(label: string, items: HomeworkItem[], alwaysShow = false) {
    if (items.length === 0 && !alwaysShow) return null;
    return (
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            {label}
          </h2>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-muted)" }}
          >
            {items.length}
          </span>
        </div>
        <div className="space-y-2">
          {items.map(renderHomeworkCard)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>
          Homework
        </h1>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Class filter chips */}
      {classes.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterClassId(null)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: filterClassId === null ? "var(--color-ink)" : "var(--color-paper-2)",
              color: filterClassId === null ? "var(--color-paper)" : "var(--color-ink-muted)",
            }}
          >
            All
          </button>
          {classes.filter((c) => !c.archived).map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterClassId(c.id === filterClassId ? null : c.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterClassId === c.id ? c.color : "var(--color-paper-2)",
                color: filterClassId === c.id ? "var(--color-paper)" : "var(--color-ink-muted)",
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddClass(!showAddClass)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
          >
            <Plus className="h-3 w-3" />
            Class
          </button>
        </div>
      )}

      {classes.length === 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowAddClass(!showAddClass)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-medium transition-colors"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add a class (subject)
          </button>
        </div>
      )}

      {/* Add class form */}
      {showAddClass && (
        <div
          className="mb-4 rounded-xl border p-4"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>New Class</h3>
            <button onClick={() => setShowAddClass(false)} style={{ color: "var(--color-ink-muted)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. AP Biology, Calculus II..."
              maxLength={100}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
            />
            <div className="flex flex-wrap gap-2">
              {CLASS_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setClassColor(color)}
                  className="h-8 w-8 rounded-full transition-transform"
                  style={{
                    backgroundColor: color,
                    outline: classColor === color ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                  }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <button
              onClick={handleAddClass}
              disabled={savingClass || !className.trim()}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 44 }}
            >
              {savingClass ? "Adding..." : "Add class"}
            </button>
          </div>
        </div>
      )}

      {/* Add homework form */}
      {showAddForm && (
        <div
          className="mb-5 rounded-xl border p-4"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>New Homework</h3>
            <button onClick={() => setShowAddForm(false)} style={{ color: "var(--color-ink-muted)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the assignment?"
              maxLength={300}
              autoFocus
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddHomework(); } }}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes (optional)"
              maxLength={2000}
              rows={2}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)] resize-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
            />

            {/* Class selector */}
            {classes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setClassId(null)}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: classId === null ? "var(--color-ink)" : "var(--color-paper)",
                    color: classId === null ? "var(--color-paper)" : "var(--color-ink-muted)",
                    border: "1px solid var(--color-paper-3)",
                  }}
                >
                  No class
                </button>
                {classes.filter((c) => !c.archived).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClassId(c.id === classId ? null : c.id)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: classId === c.id ? c.color : "var(--color-paper)",
                      color: classId === c.id ? "var(--color-paper)" : "var(--color-ink-muted)",
                      border: "1px solid var(--color-paper-3)",
                    }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Quick date chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Today", value: todayStr() },
                { label: "Tomorrow", value: tomorrowStr() },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDueDate(opt.value)}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: dueDate === opt.value ? "var(--color-accent)" : "var(--color-paper)",
                    color: dueDate === opt.value ? "var(--color-paper)" : "var(--color-ink-muted)",
                    border: "1px solid var(--color-paper-3)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-full border px-3 py-1 text-xs font-medium outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              />
            </div>

            {/* Due time (optional) */}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              />
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Due time (optional)</span>
            </div>

            {/* Kind + Priority — custom styled selectors (no native dropdowns) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>Type:</span>
                {Object.entries(KIND_LABELS).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k as typeof kind)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: kind === k ? "var(--color-ink)" : "var(--color-paper-2)",
                      color: kind === k ? "var(--color-paper)" : "var(--color-ink-muted)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>Priority:</span>
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: priority === p ? "color-mix(in oklab, " + PRIORITY_COLORS[p] + " 15%, var(--color-paper))" : "var(--color-paper-2)",
                      color: priority === p ? PRIORITY_COLORS[p] : "var(--color-ink-muted)",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: PRIORITY_COLORS[p] }}
                    />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-error)" }}>
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}

            <button
              onClick={handleAddHomework}
              disabled={saving || !title.trim()}
              className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 44 }}
            >
              {saving ? "Adding..." : "Add homework"}
            </button>
          </div>
        </div>
      )}

      {/* Homework list */}
      {pending.length === 0 && completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-3 h-10 w-10" style={{ color: "var(--color-ink-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-ink-muted)" }}>
            No homework yet. Tap &ldquo;Add&rdquo; to create your first assignment.
          </p>
        </div>
      ) : (
        <>
          {renderSection("Overdue", overdue)}
          {renderSection("Today", today)}
          {renderSection("Tomorrow", tomorrow)}
          {renderSection("This Week", thisWeek)}
          {renderSection("Later", later)}

          {/* Completed section — collapsed by default */}
          {completed.length > 0 && (
            <div className="mb-5">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="mb-2 flex items-center gap-2"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-180" : ""}`}
                  style={{ color: "var(--color-ink-muted)" }}
                />
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                  Completed
                </h2>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-muted)" }}
                >
                  {completed.length}
                </span>
              </button>
              {showCompleted && (
                <div className="space-y-2">
                  {completed.map(renderHomeworkCard)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
