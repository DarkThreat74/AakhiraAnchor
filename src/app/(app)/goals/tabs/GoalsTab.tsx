"use client";

import { useState, useCallback, useMemo } from "react";
import { Target, Plus, Check, ChevronRight, ChevronDown, Trash2, Loader2, List, GitBranch } from "lucide-react";
import type { Goal } from "@/lib/db/schema";
import { buildGoalTree, countCompleted, type GoalNode } from "@/lib/goals/tree";
import { clearApiCache } from "@/lib/sw-helpers";
import { syncGoalsToCache } from "@/lib/offline/cache-writers";

type View = "list" | "tree";

export default function GoalsTab({
  goals,
  setGoals,
  goalType,
}: {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  goalType: "long_term" | "short_term";
}) {
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Filter goals by type
  const filteredGoals = useMemo(
    () => goals.filter((g) => (g.goalType || "short_term") === goalType),
    [goals, goalType],
  );
  const tree = useMemo(() => buildGoalTree(filteredGoals), [filteredGoals]);
  const { total, done } = useMemo(() => countCompleted(tree), [tree]);

  const createGoal = useCallback(
    async (title: string, parentId?: string | null, description?: string, targetDate?: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: trimmed, parentId: parentId ?? null, description: description?.trim() || undefined, goalType, targetDate: targetDate || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.goal) {
          setGoals((prev) => {
            const updated = [...prev, data.goal];
            syncGoalsToCache(updated);
            return updated;
          });
          void clearApiCache();
        } else {
          setError(data.error || "Failed to create goal");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [goalType, setGoals],
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>) => {
      if (updates.title !== undefined || updates.description !== undefined) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === id
              ? { ...g, ...(updates.title !== undefined ? { title: updates.title } : {}), ...(updates.description !== undefined ? { description: updates.description } : {}), updatedAt: new Date() }
              : g,
          ),
        );
      }
      try {
        const res = await fetch("/api/goals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, ...updates }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.goal) {
          setGoals((prev) => {
            const updated = prev.map((g) => (g.id === id ? data.goal : g));
            syncGoalsToCache(updated);
            return updated;
          });
          void clearApiCache();
        }
      } catch {
        // keep optimistic state
      }
    },
    [setGoals],
  );

  const deleteGoal = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setGoals((prev) => {
          const toRemove = new Set<string>([id]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const g of prev) {
              if (g.parentId && toRemove.has(g.parentId) && !toRemove.has(g.id)) {
                toRemove.add(g.id);
                changed = true;
              }
            }
          }
          const remaining = prev.filter((g) => !toRemove.has(g.id));
          syncGoalsToCache(remaining);
          return remaining;
        });
        void clearApiCache();
      }
    } catch {
      // keep state
    }
  }, [setGoals]);

  const isLongTerm = goalType === "long_term";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            {isLongTerm ? "Long-term Goals" : "Short-term Goals"}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {isLongTerm ? "Yearly and life aspirations" : "Weekly and monthly milestones"}
            {total > 0 && ` · ${done}/${total} done`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === "list" ? "tree" : "list")}
            className="rounded-lg p-2 transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-muted)" }}
            title={view === "list" ? "Tree view" : "List view"}
          >
            {view === "list" ? <GitBranch className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}

      {/* Add root goal */}
      {addingRoot ? (
        <div
          className="flex flex-col gap-3 rounded-xl border p-4"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void createGoal(newTitle, null, newDescription, newTargetDate); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); setAddingRoot(false); }
              if (e.key === "Escape") { setAddingRoot(false); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); }
            }}
            placeholder="Goal title..."
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
          <input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void createGoal(newTitle, null, newDescription, newTargetDate); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); setAddingRoot(false); }
              if (e.key === "Escape") { setAddingRoot(false); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); }
            }}
            placeholder="Description (optional)..."
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
          <input
            type="date"
            value={newTargetDate}
            onChange={(e) => setNewTargetDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void createGoal(newTitle, null, newDescription, newTargetDate); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); setAddingRoot(false); }
              if (e.key === "Escape") { setAddingRoot(false); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); }
            }}
            placeholder="Target date (optional)"
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { void createGoal(newTitle, null, newDescription, newTargetDate); setNewTitle(""); setNewDescription(""); setNewTargetDate(""); setAddingRoot(false); }}
              disabled={loading || !newTitle.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </button>
            <button
              onClick={() => { setAddingRoot(false); setNewTitle(""); setNewDescription(""); }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingRoot(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
        >
          <Plus className="h-4 w-4" />
          Add {isLongTerm ? "long-term" : "short-term"} goal
        </button>
      )}

      {/* Goal list */}
      {filteredGoals.length === 0 && !addingRoot ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-8 w-8 mb-3" style={{ color: "var(--color-ink-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            No {isLongTerm ? "long-term" : "short-term"} goals yet.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="flex flex-col gap-1">
          {filteredGoals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
              editTargetDate={editTargetDate}
              setEditTargetDate={setEditTargetDate}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {tree.map((node) => (
            <GoalTreeNode
              key={node.id}
              node={node}
              goals={filteredGoals}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              onUpdate={updateGoal}
              onDelete={deleteGoal}
              onAddChild={createGoal}
              level={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Goal Row (list view) ───
function GoalRow({
  goal, editingId, setEditingId, editTitle, setEditTitle, editDescription, setEditDescription, editTargetDate, setEditTargetDate, onUpdate, onDelete,
}: {
  goal: Goal;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (s: string) => void;
  editDescription: string;
  setEditDescription: (s: string) => void;
  editTargetDate: string;
  setEditTargetDate: (s: string) => void;
  onUpdate: (id: string, updates: Partial<Goal>) => void;
  onDelete: (id: string) => void;
}) {
  const isDone = goal.status === "done";
  const isEditing = editingId === goal.id;

  return (
    <div
      className="flex items-start gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-paper-2)]"
      style={{ borderLeft: goal.color ? `3px solid ${goal.color}` : "3px solid transparent" }}
    >
      <button
        onClick={() => onUpdate(goal.id, { status: isDone ? "active" : "done", completedAt: isDone ? null : new Date() })}
        className="mt-0.5 shrink-0"
        title={isDone ? "Mark as not done" : "Mark as done"}
      >
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
          style={{
            borderColor: isDone ? "var(--color-accent)" : "var(--color-paper-3)",
            backgroundColor: isDone ? "var(--color-accent)" : "transparent",
          }}
        >
          {isDone && <Check className="h-3 w-3" style={{ color: "var(--color-paper)" }} />}
        </div>
      </button>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onUpdate(goal.id, { title: editTitle, description: editDescription, targetDate: editTargetDate || null }); setEditingId(null); }
                if (e.key === "Escape") setEditingId(null);
              }}
              className="rounded border px-2 py-1 text-sm outline-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
            />
            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onUpdate(goal.id, { title: editTitle, description: editDescription, targetDate: editTargetDate || null }); setEditingId(null); }
                if (e.key === "Escape") setEditingId(null);
              }}
              placeholder="Description..."
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
            />
            <input
              type="date"
              value={editTargetDate}
              onChange={(e) => setEditTargetDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onUpdate(goal.id, { title: editTitle, description: editDescription, targetDate: editTargetDate || null }); setEditingId(null); }
                if (e.key === "Escape") setEditingId(null);
              }}
              placeholder="Target date"
              className="rounded border px-2 py-1 text-xs outline-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
            />
          </div>
        ) : (
          <>
            <p
              className="text-sm font-medium"
              style={{
                color: isDone ? "var(--color-ink-muted)" : "var(--color-ink)",
                textDecoration: isDone ? "line-through" : "none",
              }}
            >
              {goal.title}
            </p>
            {goal.description && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-muted)" }}>{goal.description}</p>
            )}
            {goal.targetDate && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-warmth)" }}>
                Target: {new Date(goal.targetDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => { setEditingId(goal.id); setEditTitle(goal.title); setEditDescription(goal.description || ""); setEditTargetDate(goal.targetDate || ""); }}
          className="rounded p-1 text-xs transition-colors hover:bg-[var(--color-paper-3)]"
          style={{ color: "var(--color-ink-muted)" }}
          title="Edit"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="rounded p-1 transition-colors hover:bg-[var(--color-paper-3)]"
          style={{ color: "var(--color-ink-muted)" }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Goal Tree Node (tree view) ───
function GoalTreeNode({
  node, goals, editingId, setEditingId, editTitle, setEditTitle, editDescription, setEditDescription, onUpdate, onDelete, onAddChild, level,
}: {
  node: GoalNode;
  goals: Goal[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editTitle: string;
  setEditTitle: (s: string) => void;
  editDescription: string;
  setEditDescription: (s: string) => void;
  onUpdate: (id: string, updates: Partial<Goal>) => void;
  onDelete: (id: string) => void;
  onAddChild: (title: string, parentId: string | null, description?: string) => void;
  level: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const goal = node;
  const isDone = goal.status === "done";

  return (
    <div style={{ paddingLeft: level * 20 }}>
      <div className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--color-paper-2)]">
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded(!expanded)} className="shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} /> : <ChevronRight className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}
        <button
          onClick={() => onUpdate(goal.id, { status: isDone ? "active" : "done", completedAt: isDone ? null : new Date() })}
          className="shrink-0"
        >
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full border-2"
            style={{ borderColor: isDone ? "var(--color-accent)" : "var(--color-paper-3)", backgroundColor: isDone ? "var(--color-accent)" : "transparent" }}
          >
            {isDone && <Check className="h-3 w-3" style={{ color: "var(--color-paper)" }} />}
          </div>
        </button>
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium"
          style={{ color: isDone ? "var(--color-ink-muted)" : "var(--color-ink)", textDecoration: isDone ? "line-through" : "none" }}
        >
          {goal.title}
        </span>
        <button
          onClick={() => { setAddingChild(true); }}
          className="rounded p-1 text-xs transition-colors hover:bg-[var(--color-paper-3)]"
          style={{ color: "var(--color-ink-muted)" }}
          title="Add sub-goal"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {addingChild && (
        <div className="mt-1 pl-6">
          <input
            autoFocus
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && childTitle.trim()) { onAddChild(childTitle, goal.id); setChildTitle(""); setAddingChild(false); }
              if (e.key === "Escape") { setAddingChild(false); setChildTitle(""); }
            }}
            placeholder="Sub-goal title..."
            className="w-full rounded border px-2 py-1 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
        </div>
      )}
      {expanded && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map((child) => (
            <GoalTreeNode
              key={child.id}
              node={child}
              goals={goals}
              editingId={editingId}
              setEditingId={setEditingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editDescription={editDescription}
              setEditDescription={setEditDescription}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
