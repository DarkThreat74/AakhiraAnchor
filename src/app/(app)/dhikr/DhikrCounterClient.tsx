"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { hapticImpact, hapticNotification } from "@/lib/native-bridge";

interface DhikrSequence {
  id: string;
  phraseArabic: string;
  phraseTransliteration: string;
  targetCount: number;
  sequenceOrder: number;
  sourceCitation: string;
}

export default function DhikrCounterClient() {
  const [sequences, setSequences] = useState<DhikrSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [completedSequences, setCompletedSequences] = useState<Set<number>>(new Set());
  const [pulseKey, setPulseKey] = useState(0); // triggers tap animation
  const tapAreaRef = useRef<HTMLButtonElement>(null);

  // Load dhikr sequences
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dhikr").catch(() => null);
        if (cancelled) return;
        if (res?.ok) {
          const data = await res.json().catch(() => null);
          if (data?.sequences?.length > 0) {
            setSequences(data.sequences);
          }
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const current = sequences[currentIndex];
  const isLast = currentIndex === sequences.length - 1;
  const allComplete = completedSequences.size === sequences.length && sequences.length > 0;

  const goToSequence = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setCount(0);
    void hapticImpact("light");
  }, []);

  const handleTap = useCallback(() => {
    if (!current) return;
    const newCount = count + 1;
    setCount(newCount);
    setPulseKey((k) => k + 1);

    // Light haptic on each tap
    void hapticImpact("light");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(15); } catch { /* no-op */ }
    }

    if (newCount >= current.targetCount) {
      setCompletedSequences((prev) => new Set(prev).add(currentIndex));
      void hapticNotification("success");
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate([50, 30, 50]); } catch { /* no-op */ }
      }

      // Auto-advance after a brief pause
      setTimeout(() => {
        if (!isLast) {
          setCurrentIndex((i) => i + 1);
          setCount(0);
        }
      }, 600);
    }
  }, [count, current, currentIndex, isLast]);

  const handleReset = useCallback(() => {
    setCount(0);
    void hapticImpact("medium");
  }, []);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) goToSequence(currentIndex - 1);
  }, [currentIndex, goToSequence]);

  const handleNext = useCallback(() => {
    if (!isLast) goToSequence(currentIndex + 1);
  }, [currentIndex, isLast, goToSequence]);

  const handleRestartAll = useCallback(() => {
    setCompletedSequences(new Set());
    setCurrentIndex(0);
    setCount(0);
    void hapticNotification("warning");
  }, []);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-accent)", borderRightColor: "var(--color-accent)" }} />
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading dhikr…</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (sequences.length === 0) {
    return (
      <div className="mx-auto max-w-md py-8 sm:py-12">
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-paper-2)" }}>
            <span className="text-2xl">📿</span>
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Dhikr Counter</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
            No dhikr sequences have been curated yet. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  // ── All complete ──
  if (allComplete) {
    return (
      <div className="mx-auto max-w-md py-8 sm:py-12">
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in oklab, var(--color-success) 15%, transparent)" }}>
            <Check className="h-7 w-7" style={{ color: "var(--color-success)" }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Dhikr Complete</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
            You have completed all {sequences.length} dhikr sequences. May Allah accept your remembrance.
          </p>
          <button
            onClick={handleRestartAll}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", backgroundColor: "var(--color-paper-2)", minHeight: 44 }}
          >
            <RotateCcw className="h-4 w-4" />
            Start Again
          </button>
        </div>
      </div>
    );
  }

  const progress = current ? (count / current.targetCount) * 100 : 0;
  const isComplete = count >= (current?.targetCount ?? 0);

  return (
    <div className="mx-auto max-w-md">
      {/* ── Header ── */}
      <div className="mb-4">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Dhikr Counter</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          {currentIndex + 1} of {sequences.length} · {completedSequences.size} completed
        </p>
      </div>

      {/* ── Sequence progress dots ── */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {sequences.map((seq, i) => (
          <button
            key={seq.id}
            onClick={() => goToSequence(i)}
            className="h-2.5 rounded-full transition-[width,background-color] duration-200"
            style={{
              width: i === currentIndex ? 24 : 10,
              backgroundColor: completedSequences.has(i)
                ? "var(--color-success)"
                : i === currentIndex
                  ? "var(--color-accent)"
                  : "var(--color-paper-3)",
            }}
            aria-label={`Go to sequence ${i + 1}: ${seq.phraseTransliteration}`}
          />
        ))}
      </div>

      {/* ── Current dhikr phrase ── */}
      {current && (
        <div className="mb-6 text-center">
          <p
            className="text-3xl leading-loose sm:text-4xl"
            style={{ color: "var(--color-ink)", fontFamily: "var(--font-amiri, serif)", direction: "rtl" }}
          >
            {current.phraseArabic}
          </p>
          <p className="mt-2 text-sm italic" style={{ color: "var(--color-ink-soft)" }}>
            {current.phraseTransliteration}
          </p>
        </div>
      )}

      {/* ── The counter: a big beautiful tappable circle ── */}
      <div className="mb-6 flex flex-col items-center">
        {/* Count display above the button */}
        <div className="mb-4 inline-flex items-baseline gap-1.5">
          <span
            key={pulseKey}
            className="text-5xl font-bold tabular-nums sm:text-6xl"
            style={{
              color: isComplete ? "var(--color-success)" : "var(--color-accent)",
              animation: pulseKey > 0 ? "dhikr-pulse 0.3s ease-out" : undefined,
            }}
          >
            {count}
          </span>
          <span className="text-xl tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
            / {current?.targetCount ?? 0}
          </span>
        </div>

        {/* Progress ring around the tap button */}
        <div className="relative" style={{ width: "min(60vw, 220px)", height: "min(60vw, 220px)" }}>
          {/* SVG progress ring */}
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
            style={{ width: "100%", height: "100%" }}
          >
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              strokeWidth="3"
              stroke="var(--color-paper-3)"
            />
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              strokeWidth="3"
              stroke={isComplete ? "var(--color-success)" : "var(--color-accent)"}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 0.3s ease-out, stroke 0.3s ease" }}
            />
          </svg>

          {/* The tap button — the hero of the page */}
          <button
            ref={tapAreaRef}
            onClick={handleTap}
            disabled={isComplete}
            className="absolute inset-3 flex items-center justify-center rounded-full transition-transform duration-100 active:scale-95 disabled:opacity-60"
            style={{
              backgroundColor: isComplete
                ? "color-mix(in oklab, var(--color-success) 12%, var(--color-paper))"
                : "var(--color-paper)",
              border: `1px solid var(--color-paper-3)`,
              boxShadow: isComplete
                ? "none"
                : "0 4px 24px -8px color-mix(in oklab, var(--color-accent) 30%, transparent)",
            }}
            aria-label={`Count dhikr (${count} of ${current?.targetCount ?? 0})`}
          >
            <span
              className="text-sm font-medium uppercase tracking-wide"
              style={{ color: isComplete ? "var(--color-success)" : "var(--color-ink-soft)" }}
            >
              {isComplete ? "✓ Done" : "Tap"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-30"
          style={{ color: "var(--color-ink-soft)", minHeight: 36 }}
          aria-label="Previous dhikr"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          style={{ color: "var(--color-ink-muted)", minHeight: 36 }}
          aria-label="Reset count"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        <button
          onClick={handleNext}
          disabled={isLast}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:opacity-30"
          style={{ color: "var(--color-ink-soft)", minHeight: 36 }}
          aria-label="Next dhikr"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Source citation ── */}
      {current && (
        <p className="mt-4 text-center text-[11px] italic" style={{ color: "var(--color-ink-muted)" }}>
          Source: {current.sourceCitation}
        </p>
      )}

      {/* ── Pulse animation keyframes ── */}
      <style>{`
        @keyframes dhikr-pulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
