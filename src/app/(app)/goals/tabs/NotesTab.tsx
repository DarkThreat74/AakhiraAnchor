"use client";

import { useState, useCallback } from "react";
import { StickyNote, Plus, Trash2, Pin } from "lucide-react";
import type { Note } from "@/lib/db/schema";
import { clearApiCache } from "@/lib/sw-helpers";
import { upsertNoteToCache, deleteNoteFromCache } from "@/lib/offline/cache-writers";

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesTab({
  notes,
  setNotes,
}: {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, content: content.trim() }),
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        upsertNoteToCache(newNote);
        clearApiCache();
        setTitle("");
        setContent("");
        setShowAddForm(false);
      }
    } catch {
      // keep state
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = useCallback(async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() || undefined, content: editContent }),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        upsertNoteToCache(updated);
        clearApiCache();
        setEditingId(null);
      }
    } catch {
      // keep state
    } finally {
      setSaving(false);
    }
  }, [editTitle, editContent, setNotes]);

  const handleTogglePin = async (note: Note) => {
    const updated = { ...note, pinned: !note.pinned, updatedAt: new Date() };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    upsertNoteToCache(updated);
    try {
      await fetch(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !note.pinned }),
      });
      clearApiCache();
    } catch {
      // keep state
    }
  };

  const handleDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    deleteNoteFromCache(id);
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      clearApiCache();
    } catch {
      // keep state
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>Notes</h1>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          <Plus className="h-4 w-4" />
          New
        </button>
      </div>

      {showAddForm && (
        <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: "var(--color-paper-3)" }}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleAddNote(); if (e.key === "Escape") setShowAddForm(false); }}
            placeholder="Title (optional)..."
            className="rounded-lg border px-3 py-2 text-sm font-medium outline-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            rows={4}
            className="rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddNote}
              disabled={saving || (!content.trim() && !title.trim())}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setShowAddForm(false)} className="rounded-lg px-3 py-1.5 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {sortedNotes.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <StickyNote className="h-8 w-8 mb-3" style={{ color: "var(--color-ink-muted)", opacity: 0.4 }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>No notes yet. Jot down a thought.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedNotes.map((note) => {
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                className="flex flex-col gap-2 rounded-xl border p-3"
                style={{
                  borderColor: note.pinned ? "var(--color-accent)" : "var(--color-paper-3)",
                  backgroundColor: note.pinned ? "color-mix(in oklab, var(--color-accent-faint) 30%, var(--color-paper))" : "var(--color-paper)",
                }}
              >
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title..."
                      className="rounded border px-2 py-1 text-sm font-medium outline-none"
                      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="rounded border px-2 py-1 text-sm outline-none resize-none"
                      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateNote(note.id)}
                        disabled={saving}
                        className="rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1" onClick={() => { setEditingId(note.id); setEditTitle(note.title || ""); setEditContent(note.content); }}>
                        {note.title && (
                          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{note.title}</p>
                        )}
                        {note.content && (
                          <p className="text-sm whitespace-pre-wrap mt-0.5" style={{ color: "var(--color-ink-soft)" }}>{note.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className="rounded p-1 transition-colors hover:bg-[var(--color-paper-3)]"
                          style={{ color: note.pinned ? "var(--color-accent)" : "var(--color-ink-muted)" }}
                          title={note.pinned ? "Unpin" : "Pin"}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="rounded p-1 transition-colors hover:bg-[var(--color-paper-3)]"
                          style={{ color: "var(--color-ink-muted)" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{timeAgo(note.updatedAt)}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
