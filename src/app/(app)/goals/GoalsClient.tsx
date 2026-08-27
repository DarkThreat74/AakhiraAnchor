"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Target,
  Plus,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Trash2,
  Share2,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Loader2,
  List,
  GitBranch,
  AlignLeft,
} from "lucide-react";
import type { Goal } from "@/lib/db/schema";
import { buildGoalTree, countCompleted, type GoalNode } from "@/lib/goals/tree";
import { shareNative, isNativeApp, hapticNotification } from "@/lib/native-bridge";
import { clearApiCache } from "@/lib/sw-helpers";

type View = "list" | "tree";

export default function GoalsClient({ initialGoals }: { initialGoals: Goal[] }) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [view, setView] = useState<View>("list");
  const [loading, setLoading] = useState(false);
  const [addingRoot, setAddingRoot] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);
  const tree = buildGoalTree(goals);
  const { total, done } = countCompleted(tree);

  // Fetch share status on mount
  useEffect(() => {
    fetch("/api/goals/share", { method: "POST" })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data.url) setShareUrl(data.url);
      })
      .catch(() => {});
  }, []);

  // Listen for SW sync events — refetch goals when offline writes are synced
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "EVENT_SYNCED") {
        fetch("/api/goals")
          .then((r) => r.json().catch(() => ({})))
          .then((data) => {
            if (data.goals) setGoals(data.goals);
          })
          .catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const createGoal = useCallback(
    async (title: string, parentId?: string | null, description?: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: trimmed,
            parentId: parentId ?? null,
            description: description?.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.goal) {
          setGoals((prev) => [...prev, data.goal]);
          void clearApiCache();
          if (isNativeApp()) void hapticNotification("success");
        } else {
          setError(data.error || "Failed to create goal");
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>) => {
      // Optimistic update for title and description
      if (updates.title !== undefined || updates.description !== undefined) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id === id
              ? {
                  ...g,
                  ...(updates.title !== undefined ? { title: updates.title } : {}),
                  ...(updates.description !== undefined ? { description: updates.description } : {}),
                  updatedAt: new Date(),
                }
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
          setGoals((prev) => prev.map((g) => (g.id === id ? data.goal : g)));
          void clearApiCache();
          if (isNativeApp() && updates.status === "done") void hapticNotification("success");
        }
      } catch {
        // keep optimistic state
      }
    },
    [],
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
          return prev.filter((g) => !toRemove.has(g.id));
        });
        void clearApiCache();
      }
    } catch {
      // keep state
    }
  }, []);

  const toggleDone = useCallback(
    (goal: Goal) => {
      const newStatus = goal.status === "done" ? "active" : "done";
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id
            ? { ...g, status: newStatus, completedAt: newStatus === "done" ? new Date() : null }
            : g,
        ),
      );
      void updateGoal(goal.id, { status: newStatus });
    },
    [updateGoal],
  );

  const handleAddRoot = () => {
    if (newTitle.trim()) {
      void createGoal(newTitle, null, newDescription);
      setNewTitle("");
      setNewDescription("");
      setAddingRoot(false);
    }
  };

  const handleEditStart = (goal: Goal) => {
    setEditingId(goal.id);
    setEditTitle(goal.title);
    setEditDescription(goal.description || "");
  };

  const handleEditSave = (id: string) => {
    if (editTitle.trim()) {
      void updateGoal(id, { title: editTitle.trim(), description: editDescription.trim() || null });
    }
    setEditingId(null);
  };

  // ── Export functions ──

  const exportAsImage = async () => {
    if (!exportRef.current) return;
    setExporting("image");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor:
          getComputedStyle(document.body).getPropertyValue("--color-paper-2").trim() || "#f5f0e8",
        pixelRatio: 2,
      });
      // Always download — shareNative doesn't support file sharing
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-goals.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export image");
    } finally {
      setExporting(null);
    }
  };

  const exportAsPdf = async () => {
    if (!exportRef.current) return;
    setExporting("pdf");
    try {
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor:
          getComputedStyle(document.body).getPropertyValue("--color-paper-2").trim() || "#f5f0e8",
        pixelRatio: 2,
      });

      const img = new Image();
      img.src = dataUrl;
      // Fix: handle race condition where image may already be loaded
      if (img.complete) {
        // already loaded
      } else {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }

      const pdf = new jsPDF({
        orientation: img.width > img.height ? "landscape" : "portrait",
        unit: "px",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;

      pdf.addImage(dataUrl, "PNG", (pageWidth - w) / 2, 20, w, h);
      pdf.save("my-goals.pdf");
    } catch {
      setError("Failed to export PDF");
    } finally {
      setExporting(null);
    }
  };

  const handleShareLink = async () => {
    if (!shareUrl) {
      try {
        const res = await fetch("/api/goals/share", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          setShareUrl(data.url);
          // Try native share first, fallback to clipboard
          const shared = await shareNative({
            title: "My Goals — Waqt",
            text: "Check out my goals on Waqt",
            url: data.url,
          }).catch(() => false);
          if (!shared) {
            await navigator.clipboard.writeText(data.url).catch(() => {});
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        setError("Failed to create share link");
      }
    } else {
      const shared = await shareNative({
        title: "My Goals — Waqt",
        text: "Check out my goals on Waqt",
        url: shareUrl,
      }).catch(() => false);
      if (!shared) {
        await navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokeShare = async () => {
    try {
      await fetch("/api/goals/share", { method: "DELETE" });
      setShareUrl(null);
    } catch {
      // keep state
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8" style={{ minHeight: "100dvh" }}>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1
            className="text-xl font-semibold tracking-tight sm:text-2xl"
            style={{ color: "var(--color-ink)" }}
          >
            Goals
          </h1>
          {total > 0 && (
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {done}/{total} completed
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-lg border" style={{ borderColor: "var(--color-paper-3)" }}>
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 rounded-l-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3"
              style={{
                backgroundColor: view === "list" ? "var(--color-ink)" : "transparent",
                color: view === "list" ? "var(--color-paper)" : "var(--color-ink-muted)",
                minHeight: 36,
              }}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView("tree")}
              className="flex items-center gap-1.5 rounded-r-lg px-2.5 py-2 text-xs font-medium transition-colors sm:px-3"
              style={{
                backgroundColor: view === "tree" ? "var(--color-ink)" : "transparent",
                color: view === "tree" ? "var(--color-paper)" : "var(--color-ink-muted)",
                minHeight: 36,
              }}
              aria-label="Tree view"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tree</span>
            </button>
          </div>

          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center justify-center rounded-lg border px-2.5 py-2 transition-colors"
            style={{
              borderColor: "var(--color-paper-3)",
              color: "var(--color-ink-soft)",
              minHeight: 36,
              minWidth: 36,
            }}
            aria-label="Share goals"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg border p-3 text-xs font-medium"
          style={{
            borderColor: "var(--color-error)",
            color: "var(--color-error)",
            backgroundColor: "color-mix(in oklab, var(--color-error) 8%, transparent)",
          }}
        >
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Add root goal input */}
      {addingRoot ? (
        <div
          className="mb-4 rounded-xl border p-3"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRoot();
              if (e.key === "Escape") {
                setAddingRoot(false);
                setNewTitle("");
                setNewDescription("");
              }
            }}
            placeholder="What's your goal?"
            className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink)" }}
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Add details (optional)..."
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink)" }}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleAddRoot}
              disabled={loading || !newTitle.trim()}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 36 }}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add goal"}
            </button>
            <button
              onClick={() => {
                setAddingRoot(false);
                setNewTitle("");
                setNewDescription("");
              }}
              className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--color-paper-3)",
                color: "var(--color-ink-muted)",
                minHeight: 36,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingRoot(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors"
          style={{
            borderColor: "var(--color-paper-3)",
            color: "var(--color-ink-muted)",
            backgroundColor: "transparent",
            minHeight: 44,
          }}
        >
          <Plus className="h-4 w-4" />
          Add a goal
        </button>
      )}

      {/* ── Export container (only captures the goals list, not the add button) ── */}
      <div ref={exportRef} style={{ backgroundColor: "var(--color-paper-2)" }}>
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)",
              }}
            >
              <Target className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
            </div>
            <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              No goals yet
            </h2>
            <p
              className="mt-1 max-w-xs text-sm"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Create your first goal, then branch it into smaller steps. Track progress, build a map, and share with others.
            </p>
          </div>
        ) : view === "list" ? (
          <ListView
            tree={tree}
            editingId={editingId}
            editTitle={editTitle}
            editDescription={editDescription}
            setEditTitle={setEditTitle}
            setEditDescription={setEditDescription}
            onEditStart={handleEditStart}
            onEditSave={handleEditSave}
            onEditCancel={() => setEditingId(null)}
            onToggleDone={toggleDone}
            onAddChild={createGoal}
            onDelete={deleteGoal}
            onUpdateDescription={updateGoal}
            loading={loading}
          />
        ) : (
          <TreeView
            tree={tree}
            editingId={editingId}
            editTitle={editTitle}
            editDescription={editDescription}
            setEditTitle={setEditTitle}
            setEditDescription={setEditDescription}
            onEditStart={handleEditStart}
            onEditSave={handleEditSave}
            onEditCancel={() => setEditingId(null)}
            onToggleDone={toggleDone}
            onAddChild={createGoal}
            onDelete={deleteGoal}
            onUpdateDescription={updateGoal}
            loading={loading}
          />
        )}
      </div>

      {/* ── Share modal ── */}
      {shareOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl p-5 sm:rounded-2xl"
            style={{
              backgroundColor: "var(--color-paper)",
              paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                Share your goals
              </h3>
              <button
                onClick={() => setShareOpen(false)}
                className="rounded-lg p-1"
                style={{ color: "var(--color-ink-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => void exportAsImage()}
                disabled={exporting !== null || goals.length === 0}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-paper-3)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)",
                  }}
                >
                  {exporting === "image" ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      style={{ color: "var(--color-accent)" }}
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    Export as image
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                    Download as PNG
                  </p>
                </div>
              </button>

              <button
                onClick={() => void exportAsPdf()}
                disabled={exporting !== null || goals.length === 0}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--color-paper-3)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-warmth) 10%, transparent)",
                  }}
                >
                  {exporting === "pdf" ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      style={{ color: "var(--color-warmth)" }}
                    />
                  ) : (
                    <FileText className="h-4 w-4" style={{ color: "var(--color-warmth)" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    Export as PDF
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                    Download as a PDF document
                  </p>
                </div>
              </button>

              <button
                onClick={() => void handleShareLink()}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                style={{ borderColor: "var(--color-paper-3)" }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)",
                  }}
                >
                  {copied ? (
                    <Check className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                  ) : (
                    <LinkIcon className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                    {copied ? "Copied!" : shareUrl ? "Copy public link" : "Create public link"}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                    {shareUrl
                      ? shareUrl.replace(/^https?:\/\//, "")
                      : "Read-only view anyone can see"}
                  </p>
                </div>
              </button>

              {shareUrl && (
                <button
                  onClick={() => void handleRevokeShare()}
                  className="w-full rounded-xl border border-dashed py-2.5 text-xs font-medium transition-colors"
                  style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                >
                  Revoke public link
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── List View ──

interface ViewProps {
  tree: GoalNode[];
  editingId: string | null;
  editTitle: string;
  editDescription: string;
  setEditTitle: (v: string) => void;
  setEditDescription: (v: string) => void;
  onEditStart: (goal: Goal) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onToggleDone: (goal: Goal) => void;
  onAddChild: (title: string, parentId: string | null, description?: string) => void;
  onDelete: (id: string) => void;
  onUpdateDescription: (id: string, description: Partial<Goal>) => void;
  loading: boolean;
}

function ListView(props: ViewProps) {
  return (
    <div className="space-y-1">
      {props.tree.map((node) => (
        <ListRow key={node.id} node={node} {...props} />
      ))}
    </div>
  );
}

function ListRow({ node, ...props }: ViewProps & { node: GoalNode }) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childDescription, setChildDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const isEditing = props.editingId === node.id;
  const isDone = node.status === "done";
  const hasChildren = node.children.length > 0;
  const hasDescription = !!node.description;
  const indent = Math.min(node.depth, 4) * 16;

  const handleAddChild = () => {
    if (childTitle.trim()) {
      props.onAddChild(childTitle, node.id, childDescription);
      setChildTitle("");
      setChildDescription("");
      setAddingChild(false);
      setExpanded(true);
    }
  };

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-lg py-2 pr-2 transition-colors"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 rounded p-0.5"
            style={{ color: "var(--color-ink-muted)" }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        <button
          onClick={() => props.onToggleDone(node)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          style={{
            borderColor: isDone ? "var(--color-success)" : "var(--color-paper-3)",
            backgroundColor: isDone ? "var(--color-success)" : "transparent",
            minHeight: 44,
            minWidth: 44,
          }}
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
        >
          {isDone && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-paper)" }} />}
        </button>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                type="text"
                value={props.editTitle}
                onChange={(e) => props.setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") props.onEditSave(node.id);
                  if (e.key === "Escape") props.onEditCancel();
                }}
                placeholder="Goal title"
                className="w-full rounded border bg-transparent px-1.5 py-0.5 text-sm outline-none"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-ink)" }}
              />
              <textarea
                value={props.editDescription}
                onChange={(e) => props.setEditDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) props.onEditSave(node.id);
                  if (e.key === "Escape") props.onEditCancel();
                }}
                placeholder="Add details..."
                rows={2}
                className="w-full resize-none rounded border bg-transparent px-1.5 py-1 text-xs outline-none"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
              />
            </div>
          ) : (
            <div>
              <button
                onClick={() => props.onEditStart(node)}
                className="block w-full truncate text-left text-sm"
                style={{
                  color: isDone ? "var(--color-ink-muted)" : "var(--color-ink)",
                  textDecoration: isDone ? "line-through" : "none",
                }}
              >
                {node.title}
              </button>
              {hasDescription && !showDetails && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="mt-0.5 flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  <AlignLeft className="h-3 w-3" />
                  Details
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={() => setAddingChild(true)}
            className="rounded p-1.5 transition-colors"
            style={{ color: "var(--color-ink-muted)", minHeight: 36, minWidth: 36 }}
            aria-label="Add sub-goal"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this goal and all its sub-goals?")) props.onDelete(node.id);
            }}
            className="rounded p-1.5 transition-colors"
            style={{ color: "var(--color-ink-muted)", minHeight: 36, minWidth: 36 }}
            aria-label="Delete goal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Description display (when not editing) */}
      {hasDescription && showDetails && !isEditing && (
        <div
          className="flex items-start gap-2 py-1 pr-2 text-xs"
          style={{ paddingLeft: `${indent + 8 + 28 + 24}px` }}
        >
          <AlignLeft
            className="mt-0.5 h-3 w-3 shrink-0"
            style={{ color: "var(--color-ink-muted)" }}
          />
          <p
            className="min-w-0 flex-1 whitespace-pre-wrap break-words"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {node.description}
          </p>
          <button
            onClick={() => setShowDetails(false)}
            className="shrink-0 rounded p-0.5"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Add child input */}
      {addingChild && (
        <div
          className="space-y-1.5 py-1.5 pr-2"
          style={{ paddingLeft: `${indent + 24 + 8}px` }}
        >
          <input
            autoFocus
            type="text"
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") {
                setAddingChild(false);
                setChildTitle("");
                setChildDescription("");
              }
            }}
            placeholder="Sub-goal title"
            className="w-full rounded border bg-transparent px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink)" }}
          />
          <textarea
            value={childDescription}
            onChange={(e) => setChildDescription(e.target.value)}
            placeholder="Add details (optional)..."
            rows={2}
            className="w-full resize-none rounded border bg-transparent px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddChild}
              disabled={props.loading || !childTitle.trim()}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 36 }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingChild(false);
                setChildTitle("");
                setChildDescription("");
              }}
              className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--color-paper-3)",
                color: "var(--color-ink-muted)",
                minHeight: 36,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ListRow key={child.id} node={child} {...props} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tree View ──

function TreeView(props: ViewProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div
        className="inline-flex min-w-full flex-col gap-6"
        style={{ minWidth: "max-content" }}
      >
        {props.tree.map((node) => (
          <TreeBranch key={node.id} node={node} {...props} />
        ))}
      </div>
    </div>
  );
}

function TreeBranch({ node, ...props }: ViewProps & { node: GoalNode }) {
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childDescription, setChildDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const isEditing = props.editingId === node.id;
  const isDone = node.status === "done";
  const hasChildren = node.children.length > 0;
  const hasDescription = !!node.description;

  const handleAddChild = () => {
    if (childTitle.trim()) {
      props.onAddChild(childTitle, node.id, childDescription);
      setChildTitle("");
      setChildDescription("");
      setAddingChild(false);
      setExpanded(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border px-3 py-2.5"
        style={{
          borderColor: isDone ? "var(--color-success)" : "var(--color-paper-3)",
          backgroundColor: "var(--color-paper)",
          minWidth: 180,
          maxWidth: 280,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => props.onToggleDone(node)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
            style={{
              borderColor: isDone ? "var(--color-success)" : "var(--color-paper-3)",
              backgroundColor: isDone ? "var(--color-success)" : "transparent",
              minHeight: 44,
              minWidth: 44,
            }}
            aria-label={isDone ? "Mark as not done" : "Mark as done"}
          >
            {isDone && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-paper)" }} />}
          </button>

          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-1.5">
                <input
                  autoFocus
                  type="text"
                  value={props.editTitle}
                  onChange={(e) => props.setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") props.onEditSave(node.id);
                    if (e.key === "Escape") props.onEditCancel();
                  }}
                  placeholder="Goal title"
                  className="w-full rounded border bg-transparent px-1.5 py-0.5 text-sm outline-none"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-ink)" }}
                />
                <textarea
                  value={props.editDescription}
                  onChange={(e) => props.setEditDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) props.onEditSave(node.id);
                    if (e.key === "Escape") props.onEditCancel();
                  }}
                  placeholder="Add details..."
                  rows={2}
                  className="w-full resize-none rounded border bg-transparent px-1.5 py-1 text-xs outline-none"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
                />
              </div>
            ) : (
              <div>
                <button
                  onClick={() => props.onEditStart(node)}
                  className="block w-full truncate text-left text-sm font-medium"
                  style={{
                    color: isDone ? "var(--color-ink-muted)" : "var(--color-ink)",
                    textDecoration: isDone ? "line-through" : "none",
                  }}
                >
                  {node.title}
                </button>
                {hasDescription && !showDetails && (
                  <button
                    onClick={() => setShowDetails(true)}
                    className="mt-0.5 flex items-center gap-1 text-[11px]"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    <AlignLeft className="h-3 w-3" />
                    Details
                  </button>
                )}
              </div>
            )}
          </div>

          {hasChildren && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 rounded p-0.5"
              style={{ color: "var(--color-ink-muted)" }}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Description display */}
        {hasDescription && showDetails && !isEditing && (
          <div
            className="mt-2 flex items-start gap-2 border-t pt-2 text-xs"
            style={{ borderColor: "var(--color-paper-3)" }}
          >
            <AlignLeft
              className="mt-0.5 h-3 w-3 shrink-0"
              style={{ color: "var(--color-ink-muted)" }}
            />
            <p
              className="min-w-0 flex-1 whitespace-pre-wrap break-words"
              style={{ color: "var(--color-ink-soft)" }}
            >
              {node.description}
            </p>
            <button
              onClick={() => setShowDetails(false)}
              className="shrink-0 rounded p-0.5"
              style={{ color: "var(--color-ink-muted)" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1.5" style={{ paddingLeft: 12 }}>
        <button
          onClick={() => setAddingChild(true)}
          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)", minHeight: 32 }}
        >
          <Plus className="h-3 w-3" />
          Branch
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this goal and all its branches?")) props.onDelete(node.id);
          }}
          className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)", minHeight: 32 }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Add child input */}
      {addingChild && (
        <div className="space-y-1.5" style={{ paddingLeft: 12 }}>
          <input
            autoFocus
            type="text"
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") {
                setAddingChild(false);
                setChildTitle("");
                setChildDescription("");
              }
            }}
            placeholder="Sub-goal title"
            className="w-full rounded border bg-transparent px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink)", maxWidth: 240 }}
          />
          <textarea
            value={childDescription}
            onChange={(e) => setChildDescription(e.target.value)}
            placeholder="Add details (optional)..."
            rows={2}
            className="w-full resize-none rounded border bg-transparent px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", maxWidth: 240 }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddChild}
              disabled={props.loading || !childTitle.trim()}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 36 }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingChild(false);
                setChildTitle("");
                setChildDescription("");
              }}
              className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: "var(--color-paper-3)",
                color: "var(--color-ink-muted)",
                minHeight: 36,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && hasChildren && (
        <div className="relative" style={{ paddingLeft: 24 }}>
          <div
            className="absolute left-2 top-0 bottom-0 w-px"
            style={{ backgroundColor: "var(--color-paper-3)" }}
          />
          <div className="space-y-4">
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                <div
                  className="absolute left-[-12px] top-5 h-px w-3"
                  style={{ backgroundColor: "var(--color-paper-3)" }}
                />
                <TreeBranch node={child} {...props} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
