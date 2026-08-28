"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { learnSections, type LearnBlock, type Hadith } from "@/lib/content/learn";

export default function LearnClient() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1
          className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ color: "var(--color-ink)" }}
        >
          Learn
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-ink-muted)" }}
        >
          The virtues of salah, how to pray, and the sunnahs that strengthen
          your day. Tap any card to explore.
        </p>
      </div>

      {/* ── Section cards (accordion) ── */}
      <div className="space-y-3">
        {learnSections.map((section, index) => {
          const isOpen = openId === section.id;

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-xl border transition-colors"
              style={{
                borderColor: isOpen
                  ? "color-mix(in oklab, var(--color-accent) 30%, var(--color-paper-3))"
                  : "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
              }}
            >
              {/* Card header (click to toggle) */}
              <button
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-paper-2)]"
                aria-expanded={isOpen}
                aria-controls={`section-content-${section.id}`}
                style={{ minHeight: 56 }}
              >
                {/* Number badge */}
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums"
                  style={{
                    backgroundColor: isOpen
                      ? "color-mix(in oklab, var(--color-accent) 12%, transparent)"
                      : "var(--color-paper-2)",
                    color: isOpen
                      ? "var(--color-accent)"
                      : "var(--color-ink-muted)",
                  }}
                >
                  {index + 1}
                </span>

                {/* Title + subtitle */}
                <div className="min-w-0 flex-1">
                  <h2
                    className="text-sm font-semibold leading-tight sm:text-base"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {section.title}
                  </h2>
                  <p
                    className="mt-0.5 truncate text-xs leading-relaxed sm:text-[13px]"
                    style={{ color: "var(--color-ink-muted)" }}
                  >
                    {section.subtitle}
                  </p>
                </div>

                {/* Chevron */}
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200"
                  style={{
                    color: "var(--color-ink-muted)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {/* Card content (expandable) */}
              {isOpen && (
                <div
                  id={`section-content-${section.id}`}
                  className="border-t px-5 py-5"
                  style={{ borderColor: "var(--color-paper-3)" }}
                >
                  <div className="space-y-4">
                    {section.content.map((block, i) => (
                      <BlockRenderer key={i} block={block} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer note ── */}
      <p
        className="mt-8 text-center text-xs leading-relaxed"
        style={{ color: "var(--color-ink-muted)" }}
      >
        All hadith are sourced from authenticated collections. Sources are cited
        for verification.
      </p>
    </div>
  );
}

// ── Block renderer ──

function BlockRenderer({ block }: { block: LearnBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {block.text}
        </p>
      );

    case "heading":
      return (
        <h3
          className="pt-2 text-sm font-semibold tracking-tight"
          style={{ color: "var(--color-ink)" }}
        >
          {block.text}
        </h3>
      );

    case "hadith":
      return <HadithBlock hadith={block.hadith} />;

    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--color-accent-soft)" }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "steps":
      return (
        <ol className="space-y-3">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent)",
                }}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );

    case "callout":
      return (
        <div
          className="rounded-lg px-4 py-3"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-warmth) 6%, transparent)",
            borderLeft: "3px solid var(--color-warmth)",
          }}
        >
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-ink-soft)" }}
          >
            {block.text}
          </p>
        </div>
      );

    default:
      return null;
  }
}

// ── Hadith block — special styling with Arabic + English + source ──

function HadithBlock({ hadith }: { hadith: Hadith }) {
  return (
    <div
      className="rounded-lg px-4 py-4"
      style={{
        backgroundColor: "color-mix(in oklab, var(--color-accent) 4%, var(--color-paper))",
        border: "1px solid color-mix(in oklab, var(--color-accent) 15%, transparent)",
      }}
    >
      {/* Arabic text */}
      <p
        dir="rtl"
        className="mb-3 text-right text-base leading-loose"
        style={{
          fontFamily: "var(--font-amiri), Georgia, serif",
          color: "var(--color-ink)",
          fontSize: "1.05rem",
          lineHeight: 2,
        }}
      >
        {hadith.arabic}
      </p>

      {/* Divider */}
      <div
        className="mb-3 h-px"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-accent) 15%, transparent)",
        }}
      />

      {/* English translation */}
      <p
        className="mb-3 text-sm leading-relaxed"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {hadith.english}
      </p>

      {/* Source + grade */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2 py-1 text-[11px] font-medium"
          style={{
            backgroundColor: "var(--color-paper-2)",
            color: "var(--color-ink-muted)",
          }}
        >
          {hadith.source}
        </span>
        {hadith.grade && (
          <span
            className="rounded-md px-2 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)",
              color: "var(--color-success)",
            }}
          >
            {hadith.grade}
          </span>
        )}
      </div>
    </div>
  );
}
