"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { X, Sparkles, ChevronRight, BookOpen, Lightbulb } from "lucide-react";
import {
  getNextFunFactIndex,
  getFunFactByIndex,
  shouldShowFunFact,
  type FunFact,
} from "@/lib/content/fun-facts";

const STORAGE_KEY_LAST_SHOWN = "waqt:funfact:lastShown";
const STORAGE_KEY_INDEX = "waqt:funfact:index";
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

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

// ── Inline glossary: renders explanation text with clickable glossary terms ──
function ExplanationWithGlossary({
  text,
  glossary,
}: {
  text: string;
  glossary?: { term: string; definition: string }[];
}) {
  const [openTerm, setOpenTerm] = useState<string | null>(null);

  // Build a regex that matches any glossary term (case-insensitive, whole word)
  const segments = useMemo(() => {
    if (!glossary || glossary.length === 0) return [{ type: "text" as const, value: text }];

    // Sort terms by length descending so longer terms match first
    const sortedTerms = [...glossary].sort((a, b) => b.term.length - a.term.length);
    const escaped = sortedTerms.map((g) => g.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

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
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", value: text.slice(lastIndex) });
    }
    return parts;
  }, [text, glossary]);

  const getDefinition = (term: string) =>
    glossary?.find((g) => g.term.toLowerCase() === term.toLowerCase())?.definition;

  return (
    <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const def = getDefinition(seg.term || seg.value);
        const isOpen = openTerm === seg.term;
        return (
          <span key={i} className="relative inline">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenTerm(isOpen ? null : seg.term || seg.value);
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
                className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border p-3 text-xs shadow-xl"
                style={{
                  backgroundColor: "var(--color-paper)",
                  borderColor: "var(--color-paper-3)",
                  color: "var(--color-ink-soft)",
                  lineHeight: 1.5,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold" style={{ color: "var(--color-ink)" }}>
                  {seg.term}:
                </span>{" "}
                {def}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

export default function FunFactPopup() {
  const [initialState] = useState(getInitialFact);
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fact] = useState<FunFact | null>(initialState.fact);

  useEffect(() => {
    if (!initialState.shouldShow || !initialState.fact) return;
    const timer = setTimeout(() => setShow(true), 600);
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

  const categoryColors: Record<string, string> = {
    salah: "var(--color-accent)",
    wudu: "var(--color-success)",
    fasting: "var(--color-warmth)",
    quran: "var(--color-accent)",
    adab: "var(--color-ink-soft)",
    general: "var(--color-ink-muted)",
  };

  const categoryLabels: Record<string, string> = {
    salah: "Prayer",
    wudu: "Purification",
    fasting: "Fasting",
    quran: "Quran",
    adab: "Etiquette",
    general: "General",
  };

  const accentColor = categoryColors[fact.category] || "var(--color-accent)";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 40%, transparent)" }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-visible rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: "var(--color-paper)",
          borderColor: "color-mix(in oklab, " + accentColor + " 30%, var(--color-paper-3))",
          animation: "funFactEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="h-1 w-full rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, color-mix(in oklab, ${accentColor} 40%, transparent))`,
          }}
        />

        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-muted)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {!revealed ? (
          <div className="flex flex-col items-center gap-4 p-6 pt-7 text-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in oklab, ${accentColor} 12%, var(--color-paper))`,
              }}
            >
              <Sparkles className="h-7 w-7" style={{ color: accentColor }} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accentColor }}>
                Did you know?
              </p>
              <h2 className="text-lg font-semibold leading-snug" style={{ color: "var(--color-ink)" }}>
                {fact.teaser}
              </h2>
            </div>

            <button
              onClick={() => setRevealed(true)}
              className="mt-2 flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-all hover:scale-[1.02]"
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
          <div className="flex flex-col gap-4 p-6 pt-5">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in oklab, ${accentColor} 12%, var(--color-paper))`,
                  color: accentColor,
                }}
              >
                {categoryLabels[fact.category]}
              </span>
            </div>

            <h2 className="text-base font-semibold leading-snug" style={{ color: "var(--color-ink)" }}>
              {fact.reveal}
            </h2>

            <ExplanationWithGlossary text={fact.explanation} glossary={fact.glossary} />

            {fact.glossary && fact.glossary.length > 0 && (
              <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                Tap the highlighted words to learn what they mean.
              </p>
            )}

            {fact.source && (
              <p className="text-xs italic" style={{ color: "var(--color-ink-muted)" }}>
                Source: {fact.source}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t" style={{ borderColor: "var(--color-paper-3)" }}>
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
      `}</style>
    </div>
  );
}
