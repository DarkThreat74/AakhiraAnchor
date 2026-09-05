"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Compass, Heart, HandHeart, BookOpen, PlayCircle, Wrench, X, Moon, Sparkles, ArrowRight } from "lucide-react";

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
    description: "Direction to the Kaaba",
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
    description: "Convert between Gregorian and Hijri",
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

export default function ToolsMenu({ variant = "icon" }: { variant?: "icon" | "sidebar" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Mount guard for portal (document.body doesn't exist during SSR)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
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

  // Smooth dismiss with exit animation
  function dismiss() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  }

  return (
    <>
      {/* Trigger button — variant controls appearance */}
      {variant === "sidebar" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <Wrench className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
          Tools
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)", minHeight: 36, minWidth: 36 }}
          aria-label="Open tools menu"
        >
          <Wrench className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
        </button>
      )}

      {/* Tool picker — rendered via portal to escape any containing block
          created by backdrop-filter on ancestor headers */}
      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          style={{
            backgroundColor: "color-mix(in oklab, var(--color-ink) 50%, transparent)",
            animation: closing ? "tools-fade-out 0.2s ease-out forwards" : "tools-fade-in 0.2s ease-out",
          }}
          onClick={dismiss}
        >
          <div
            ref={sheetRef}
            className="w-full overflow-hidden rounded-t-3xl border sm:max-w-sm sm:rounded-3xl"
            style={{
              backgroundColor: "var(--color-paper)",
              borderColor: "var(--color-paper-3)",
              paddingBottom: "env(safe-area-inset-bottom)",
              maxHeight: "85vh",
              overflowY: "auto",
              animation: closing
                ? "tools-slide-down 0.2s ease-in forwards"
                : "tools-slide-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <div className="h-1 w-9 rounded-full" style={{ backgroundColor: "var(--color-paper-3)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 sm:pt-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
                  Tools
                </h2>
                <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                  Islamic utilities and resources
                </p>
              </div>
              <button
                onClick={dismiss}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ color: "var(--color-ink-muted)", minHeight: 32, minWidth: 32 }}
                aria-label="Close tools menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tools list — clean rows, not a grid */}
            <div className="px-3 pb-4">
              {TOOLS.map((tool, i) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    prefetch
                    onClick={() => setOpen(false)}
                    className="group flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--color-paper-2)]"
                    style={{
                      animation: `tools-item-in 0.3s ease-out ${0.04 * i + 0.05}s both`,
                    }}
                  >
                    {/* Icon with tinted background */}
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `color-mix(in oklab, ${tool.color} 14%, transparent)` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: tool.color }} />
                    </div>

                    {/* Label + description */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight" style={{ color: "var(--color-ink)" }}>
                        {tool.label}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] leading-tight" style={{ color: "var(--color-ink-muted)" }}>
                        {tool.description}
                      </p>
                    </div>

                    {/* Arrow that appears on hover (desktop) */}
                    <ArrowRight
                      className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: "var(--color-ink-muted)" }}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Animations */}
      <style>{`
        @keyframes tools-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tools-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes tools-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes tools-slide-down {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        @keyframes tools-item-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (min-width: 640px) {
          @keyframes tools-slide-up {
            from { transform: translateY(20px) scale(0.98); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes tools-slide-down {
            from { transform: translateY(0) scale(1); opacity: 1; }
            to { transform: translateY(20px) scale(0.98); opacity: 0; }
          }
        }
      `}</style>
    </>
  );
}
