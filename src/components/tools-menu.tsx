"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Compass, Heart, HandHeart, BookOpen, PlayCircle, Wrench, X, Moon, Sparkles } from "lucide-react";

interface Tool {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}

const TOOLS: Tool[] = [
  {
    href: "/qibla",
    label: "Qibla Compass",
    description: "Find the direction to the Kaaba",
    icon: Compass,
    color: "var(--color-accent)",
  },
  {
    href: "/dhikr",
    label: "Dhikr Counter",
    description: "Tasbih counter with curated sequences",
    icon: Heart,
    color: "var(--color-warmth)",
  },
  {
    href: "/sadaqah",
    label: "Akhirah Card",
    description: "Track your charitable giving",
    icon: HandHeart,
    color: "var(--color-success)",
  },
  {
    href: "/names",
    label: "99 Names of Allah",
    description: "Learn the beautiful names",
    icon: Sparkles,
    color: "var(--color-accent)",
  },
  {
    href: "/hijri",
    label: "Hijri Converter",
    description: "Convert between Gregorian and Hijri dates",
    icon: Moon,
    color: "var(--color-ink-soft)",
  },
  {
    href: "/learn",
    label: "Learn",
    description: "Islamic prayer knowledge library",
    icon: BookOpen,
    color: "var(--color-ink-soft)",
  },
  {
    href: "/talks",
    label: "Talks",
    description: "Curated lectures and khutbahs",
    icon: PlayCircle,
    color: "var(--color-ink-soft)",
  },
];

export default function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Listen for custom event to open from sidebar/desktop
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-tools-menu", handler);
    return () => window.removeEventListener("open-tools-menu", handler);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [open]);

  return (
    <>
      {/* Tools icon button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
        style={{ color: "var(--color-ink-soft)", minHeight: 36, minWidth: 36 }}
        aria-label="Open tools menu"
      >
        <Wrench className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 40%, transparent)" }}
          onClick={() => setOpen(false)}
        >
          <div
            ref={sheetRef}
            className="w-full max-w-md overflow-hidden rounded-t-3xl border sm:rounded-3xl"
            style={{
              backgroundColor: "var(--color-paper)",
              borderColor: "var(--color-paper-3)",
              paddingBottom: "env(safe-area-inset-bottom)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full" style={{ backgroundColor: "var(--color-paper-3)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Tools</h2>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                  Islamic utilities and resources
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ color: "var(--color-ink-muted)", minHeight: 36, minWidth: 36 }}
                aria-label="Close tools menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tools grid */}
            <div className="grid grid-cols-2 gap-2 px-4 pb-5 sm:gap-3">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    prefetch
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-2 rounded-2xl border p-4 transition-colors hover:bg-[var(--color-paper-2)]"
                    style={{
                      borderColor: "var(--color-paper-3)",
                      backgroundColor: "var(--color-paper)",
                      minHeight: 96,
                    }}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `color-mix(in oklab, ${tool.color} 12%, transparent)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: tool.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight sm:text-sm" style={{ color: "var(--color-ink)" }}>
                        {tool.label}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight sm:text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                        {tool.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
