"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { X, ChevronRight, BookOpen, Lightbulb } from "lucide-react";
import {
  getNextFunFactIndex,
  getFunFactByIndex,
  shouldShowFunFact,
  GLOBAL_GLOSSARY,
  type FunFact,
} from "@/lib/content/fun-facts";

const STORAGE_KEY_LAST_SHOWN = "waqt:funfact:lastShown";
const STORAGE_KEY_INDEX = "waqt:funfact:index";
const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

function getInitialFact(): { fact: FunFact | null; shouldShow: boolean } {
  if (typeof window === "undefined") return { fact: null, shouldShow: false };

  const lastShownStr = localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
  const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : null;

  if (!shouldShowFunFact(lastShown, MIN_INTERVAL_MS)) return { fact: null, shouldShow: false };

  const lastIndexStr = localStorage.getItem(STORAGE_KEY_INDEX);
  const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;
  const nextIndex = getNextFunFactIndex(lastIndex);
  const nextFact = getFunFactByIndex(nextIndex);

  return { fact: nextFact, shouldShow: true };
}

// Merge global glossary with per-card glossary (per-card takes priority on conflicts)
function getMergedGlossary(fact: FunFact): { term: string; definition: string }[] {
  const map = new Map<string, { term: string; definition: string }>();
  for (const g of GLOBAL_GLOSSARY) map.set(g.term.toLowerCase(), g);
  if (fact.glossary) {
    for (const g of fact.glossary) map.set(g.term.toLowerCase(), g);
  }
  return Array.from(map.values());
}

// ── Inline glossary text renderer ──
// Highlights any glossary term found in the text and makes it clickable.
// Uses a lookahead-based regex that handles multi-word and hyphenated terms.
function GlossaryText({
  text,
  glossary,
}: {
  text: string;
  glossary: { term: string; definition: string }[];
}) {
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  const segments = useMemo(() => {
    if (!glossary || glossary.length === 0) return [{ type: "text" as const, value: text }];

    // Sort terms by length descending so longer terms match first
    const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);
    const escaped = sortedTerms.map((g) => g.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // Use lookahead so we don't consume characters, and handle word boundaries
    // including hyphens and spaces within terms
    const regex = new RegExp(`(${escaped.join("|")})`, "gi");

    const parts: { type: "text" | "term"; value: string; term?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      const matchedText = match[0];
      const glossaryEntry = sortedTerms.find(
        (g) => g.term.toLowerCase() === matchedText.toLowerCase()
      );
      parts.push({ type: "term", value: matchedText, term: glossaryEntry?.term });
      lastIndex = match.index + matchedText.length;
      // Prevent infinite loop on zero-length matches
      if (regex.lastIndex === match.index) regex.lastIndex++;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }
    return parts;
  }, [text, glossary]);

  const getDefinition = (term: string) =>
    glossary.find((g) => g.term.toLowerCase() === term.toLowerCase())?.definition;

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const def = getDefinition(seg.term || seg.value);
        const termKey = (seg.term || seg.value).toLowerCase();
        const isOpen = openTerm === termKey;
        return (
          <span key={i} className="relative inline">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenTerm(isOpen ? null : termKey);
              }}
              className="inline cursor-pointer border-b border-dashed font-medium transition-colors hover:opacity-70"
              style={{
                color: "var(--color-accent)",
                borderColor: "var(--color-accent)",
              }}
            >
              {seg.value}
            </button>
            {isOpen && def && (
              <span
                className="absolute left-0 top-full z-30 mt-1 block w-72 max-w-[90vw] rounded-xl border p-3.5 text-xs shadow-2xl"
                style={{
                  backgroundColor: "var(--color-paper)",
                  borderColor: "color-mix(in oklab, var(--color-accent) 25%, var(--color-paper-3))",
                  color: "var(--color-ink-soft)",
                  lineHeight: 1.6,
                  animation: "glossaryFadeIn 0.15s ease-out",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="block font-semibold mb-1" style={{ color: "var(--color-ink)" }}>
                  {seg.term}
                </span>
                {def}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// ── Ornamental divider symbol ──
function OrnamentDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1" style={{ color, opacity: 0.5 }}>
      <span className="h-px w-12" style={{ backgroundColor: "currentColor" }} />
      <span className="text-base leading-none" style={{ fontSize: "14px" }}>۞</span>
      <span className="h-px w-12" style={{ backgroundColor: "currentColor" }} />
    </div>
  );
}

export default function FunFactPopup() {
  const [initialState] = useState(getInitialFact);
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fact] = useState<FunFact | null>(initialState.fact);

  useEffect(() => {
    if (!initialState.shouldShow || !initialState.fact) return;
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    setShow(false);
    if (fact) {
      localStorage.setItem(STORAGE_KEY_LAST_SHOWN, Date.now().toString());
      const lastIndexStr = localStorage.getItem(STORAGE_KEY_INDEX);
      const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;
      const nextIndex = getNextFunFactIndex(lastIndex);
      localStorage.setItem(STORAGE_KEY_INDEX, nextIndex.toString());
    }
  }

  useEffect(() => {
    if (!show) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleDismiss();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, fact]);

  if (!show || !fact) return null;

  const mergedGlossary = getMergedGlossary(fact);

  const categoryColors: Record<string, string> = {
    salah: "var(--color-accent)",
    wudu: "var(--color-success)",
    fasting: "var(--color-warmth)",
    quran: "var(--color-accent)",
    adab: "var(--color-ink-soft)",
    dhikr: "var(--color-accent)",
    prophet: "var(--color-warmth)",
    history: "var(--color-ink-muted)",
    zakat: "var(--color-success)",
    hajj: "var(--color-warmth)",
    general: "var(--color-ink-muted)",
  };

  const categoryLabels: Record<string, string> = {
    salah: "Prayer",
    wudu: "Purification",
    fasting: "Fasting",
    quran: "Quran",
    adab: "Etiquette",
    dhikr: "Remembrance",
    prophet: "Prophet ﷺ",
    history: "History",
    zakat: "Charity",
    hajj: "Pilgrimage",
    general: "General",
  };

  const accentColor = categoryColors[fact.category] || "var(--color-accent)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-visible rounded-3xl border shadow-2xl"
        style={{
          backgroundColor: "var(--color-paper)",
          borderColor: "color-mix(in oklab, " + accentColor + " 20%, var(--color-paper-3))",
          animation: "funFactEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Top accent bar with ornament ── */}
        <div
          className="flex items-center justify-center rounded-t-3xl py-2"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${accentColor} 8%, var(--color-paper)), transparent)`,
          }}
        >
          <span className="text-lg" style={{ color: accentColor, opacity: 0.6 }}>۞</span>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-muted)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Teaser state (before click) ── */}
        {!revealed ? (
          <div className="flex flex-col items-center gap-5 px-6 pb-7 pt-3 text-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: accentColor, opacity: 0.8 }}>
                Did you know
              </p>
              <h2 className="text-[17px] font-semibold leading-snug px-2" style={{ color: "var(--color-ink)" }}>
                {fact.teaser}
              </h2>
            </div>

            <OrnamentDivider color={accentColor} />

            <button
              onClick={() => setRevealed(true)}
              className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03]"
              style={{
                backgroundColor: accentColor,
                color: "var(--color-paper)",
              }}
            >
              <Lightbulb className="h-4 w-4" />
              Tell me
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* ── Revealed state (after click) ── */
          <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${accentColor} 10%, var(--color-paper))`,
                  color: accentColor,
                }}
              >
                {categoryLabels[fact.category]}
              </span>
            </div>

            {/* The reveal */}
            <h2 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--color-ink)" }}>
              <GlossaryText text={fact.reveal} glossary={mergedGlossary} />
            </h2>

            {/* Arabic text (if available) */}
            {fact.arabicText && (
              <p
                className="text-right text-base leading-loose py-2"
                dir="rtl"
                lang="ar"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
                  fontSize: "18px",
                }}
              >
                {fact.arabicText}
              </p>
            )}

            {/* Ornamental divider */}
            <OrnamentDivider color={accentColor} />

            {/* Explanation with inline glossary */}
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              <GlossaryText text={fact.explanation} glossary={mergedGlossary} />
            </p>

            {/* Hint about tappable terms */}
            <p className="text-[11px]" style={{ color: "var(--color-ink-muted)", opacity: 0.7 }}>
              Tap any highlighted word to see its definition.
            </p>

            {/* Source */}
            {fact.source && (
              <p className="text-[11px] italic" style={{ color: "var(--color-ink-muted)" }}>
                Source: <GlossaryText text={fact.source} glossary={mergedGlossary} />
              </p>
            )}

            {/* Action bar */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--color-paper-3)" }}>
              <Link
                href="/learn"
                className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: accentColor }}
                onClick={handleDismiss}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Explore Learn
              </Link>
              <button
                onClick={handleDismiss}
                className="rounded-full px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--color-ink)",
                  color: "var(--color-paper)",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes funFactEnter {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes glossaryFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
