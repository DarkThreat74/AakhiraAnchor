"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square, CheckCircle2 } from "lucide-react";

interface HuddleTask {
  id: string;
  title: string;
  category: string | null;
  isDefaultFree: boolean;
  completed: boolean;
}

interface HuddleData {
  date: string;
  tasks: HuddleTask[];
  completedCount: number;
  totalCount: number;
}

export default function HuddleClient() {
  const [data, setData] = useState<HuddleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/huddle").catch(() => null);
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

  const toggleTask = useCallback(async (taskId: string, currentCompleted: boolean) => {
    setToggling(taskId);
    // Optimistic update
    if (data) {
      setData({
        ...data,
        tasks: data.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !currentCompleted } : t,
        ),
        completedCount: currentCompleted
          ? data.completedCount - 1
          : data.completedCount + 1,
      });
    }
    try {
      await fetch("/api/huddle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, completed: !currentCompleted }),
      });
    } catch {
      /* revert on failure */
      if (data) {
        setData({
          ...data,
          tasks: data.tasks.map((t) =>
            t.id === taskId ? { ...t, completed: currentCompleted } : t,
          ),
          completedCount: currentCompleted
            ? data.completedCount + 1
            : data.completedCount - 1,
        });
      }
    } finally {
      setToggling(null);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading huddle…</p>
        </div>
      </div>
    );
  }

  if (!data || data.tasks.length === 0) {
    return (
      <div className="mx-auto max-w-md py-8 sm:py-12">
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <CheckSquare className="h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Daily Huddle</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
            No huddle tasks have been set up yet. Please check back soon —
            your daily task list will appear here.
          </p>
        </div>
      </div>
    );
  }

  const allComplete = data.completedCount === data.totalCount;
  const progressPct = data.totalCount > 0 ? (data.completedCount / data.totalCount) * 100 : 0;

  // Group tasks by category
  const categories = Array.from(
    new Set(data.tasks.map((t) => t.category).filter(Boolean)),
  ) as string[];
  const uncategorized = data.tasks.filter((t) => !t.category);

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Daily Huddle</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          {new Date(data.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
            {data.completedCount} / {data.totalCount} completed
          </span>
          {allComplete && (
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-success)" }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              All done!
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${progressPct}%`,
              backgroundColor: allComplete ? "var(--color-success)" : "var(--color-accent)",
            }}
          />
        </div>
      </div>

      {/* ── All complete celebration ── */}
      {allComplete && (
        <div
          className="mb-6 rounded-2xl border p-5 text-center"
          style={{ borderColor: "color-mix(in oklab, var(--color-success) 30%, var(--color-paper-3))", backgroundColor: "color-mix(in oklab, var(--color-success) 6%, var(--color-paper))" }}
        >
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8" style={{ color: "var(--color-success)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Huddle complete!</p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            You&apos;ve finished all your tasks for today.
          </p>
        </div>
      )}

      {/* ── Tasks by category ── */}
      {categories.map((cat) => {
        const catTasks = data.tasks.filter((t) => t.category === cat);
        if (catTasks.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
              {cat}
            </h2>
            <div className="space-y-1.5">
              {catTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} toggling={toggling === task.id} />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Uncategorized tasks ── */}
      {uncategorized.length > 0 && (
        <div className="mb-6">
          {categories.length > 0 && (
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
              General
            </h2>
          )}
          <div className="space-y-1.5">
            {uncategorized.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={toggleTask} toggling={toggling === task.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle, toggling }: { task: HuddleTask; onToggle: (id: string, completed: boolean) => void; toggling: boolean }) {
  return (
    <button
      onClick={() => onToggle(task.id, task.completed)}
      disabled={toggling}
      className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50"
      style={{
        borderColor: task.completed ? "color-mix(in oklab, var(--color-success) 25%, var(--color-paper-3))" : "var(--color-paper-3)",
        backgroundColor: task.completed ? "color-mix(in oklab, var(--color-success) 5%, var(--color-paper))" : "var(--color-paper)",
        minHeight: 52,
      }}
    >
      {task.completed ? (
        <CheckSquare className="h-5 w-5 shrink-0" style={{ color: "var(--color-success)" }} />
      ) : (
        <Square className="h-5 w-5 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
      )}
      <span
        className="flex-1 text-sm font-medium"
        style={{
          color: task.completed ? "var(--color-ink-muted)" : "var(--color-ink)",
          textDecoration: task.completed ? "line-through" : "none",
        }}
      >
        {task.title}
      </span>
    </button>
  );
}
