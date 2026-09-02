"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCachedPrayerSettings } from "@/lib/offline/settings-cache";

/**
 * Client-side date header for the day calendar.
 *
 * Why client-side? The server computes "today" in the user's timezone, but
 * when the PWA is served from cache offline (possibly the next day), a
 * server-rendered date would be stale. This component computes "today"
 * on the client using the cached prayer timezone, so the cached shell
 * works correctly across days.
 */
export default function DayDateHeader({ date }: { date: string }) {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const cached = getCachedPrayerSettings();
    const tz = cached?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    // Defer setState to avoid cascading renders (react-hooks/set-state-in-effect)
    Promise.resolve().then(() => {
      try {
        const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
        const computed = new Date(nowInTz).toISOString().split("T")[0];
        setToday(computed);
      } catch {
        const now = new Date();
        setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
      }
    });
  }, []);

  // Calculate prev/next days
  const [y, m, d] = date.split("-").map(Number);
  const prevDate = new Date(y, m - 1, d - 1);
  const nextDate = new Date(y, m - 1, d + 1);
  const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
  const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

  const dateObj = new Date(y, m - 1, d);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const isToday = today !== null && date === today;

  return (
    <div className="overflow-x-hidden border-b" style={{ borderColor: "var(--color-paper-3)" }}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        {/* Prev day */}
        <Link
          href={`/calendar/day?date=${prevStr}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>

        {/* Date + view toggle */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
          <div className="text-center">
            <h1 className="truncate text-sm font-semibold tracking-tight sm:text-lg" style={{ color: "var(--color-ink)" }}>
              {formattedDate}
            </h1>
            {isToday && (
              <p className="text-xs" style={{ color: "var(--color-accent)" }}>Today</p>
            )}
          </div>

          {/* Day/Month toggle */}
          <div
            className="flex shrink-0 rounded-lg border"
            style={{ borderColor: "var(--color-paper-3)" }}
          >
            <Link
              href={`/calendar/day?date=${date}`}
              className="rounded-l-lg px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              Day
            </Link>
            <Link
              href={`/calendar/month?year=${dateObj.getFullYear()}&month=${dateObj.getMonth() + 1}`}
              className="rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Month
            </Link>
          </div>
        </div>

        {/* Next day */}
        <Link
          href={`/calendar/day?date=${nextStr}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
