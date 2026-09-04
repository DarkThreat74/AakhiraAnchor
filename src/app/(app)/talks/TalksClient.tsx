"use client";

import { useState, useEffect } from "react";
import { ExternalLink, PlayCircle, Tag } from "lucide-react";

interface Talk {
  id: string;
  title: string;
  speaker: string | null;
  category: string | null;
  externalUrl: string;
  addedAt: string;
}

export default function TalksClient() {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async () => {
      try {
        const res = await fetch("/api/talks").catch(() => null);
        if (cancelled) return;
        if (res?.ok) {
          const data = await res.json().catch(() => null);
          if (data?.talks) setTalks(data.talks);
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Extract unique categories for filter pills
  const categories = Array.from(
    new Set(talks.map((t) => t.category).filter(Boolean)),
  ) as string[];

  const filtered = filter ? talks.filter((t) => t.category === filter) : talks;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading talks…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Talks Library</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Curated lectures and khutbahs from trusted speakers
        </p>
      </div>

      {talks.length === 0 ? (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <PlayCircle className="h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            No talks have been curated yet. Please check back soon — lectures from
            trusted speakers will be linked here.
          </p>
        </div>
      ) : (
        <>
          {/* ── Category filters ── */}
          {categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setFilter(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: !filter ? "var(--color-accent)" : "var(--color-paper-3)",
                  color: !filter ? "var(--color-accent)" : "var(--color-ink-muted)",
                  backgroundColor: !filter ? "color-mix(in oklab, var(--color-accent) 10%, transparent)" : "transparent",
                  minHeight: 32,
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: filter === cat ? "var(--color-accent)" : "var(--color-paper-3)",
                    color: filter === cat ? "var(--color-accent)" : "var(--color-ink-muted)",
                    backgroundColor: filter === cat ? "color-mix(in oklab, var(--color-accent) 10%, transparent)" : "transparent",
                    minHeight: 32,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ── Talks list ── */}
          <div className="space-y-2">
            {filtered.map((talk) => (
              <a
                key={talk.id}
                href={talk.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border p-4 transition-colors"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
                  <PlayCircle className="h-5 w-5" style={{ color: "var(--color-accent)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    {talk.title}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2">
                    {talk.speaker && (
                      <span className="truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>
                        {talk.speaker}
                      </span>
                    )}
                    {talk.category && (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px]" style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-muted)" }}>
                        <Tag className="h-2.5 w-2.5" />
                        {talk.category}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
