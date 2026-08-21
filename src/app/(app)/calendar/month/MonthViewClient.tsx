"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MonthViewClient({ year, month }: { year: number; month: number }) {
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Single range query for the whole month instead of 31 individual calls
        const fromStr = `${year}-${String(month).padStart(2, "0")}-01`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const toStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const res = await fetch(`/api/events?from=${fromStr}&to=${toStr}`);
        if (res.ok) {
          const events = await res.json();
          const counts: Record<string, number> = {};
          for (const event of events) {
            const eventDate = event.startAt.split("T")[0];
            counts[eventDate] = (counts[eventDate] || 0) + 1;
          }
          if (!cancelled) setEventCounts(counts);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [year, month]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  // Use local date, not UTC (toISOString returns UTC which can be off by a day)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];

  // Empty cells before the first day
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: null });
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateStr });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Month navigation */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/calendar/month?year=${prevYear}&month=${prevMonth}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {monthNames[month - 1]} {year}
        </h1>
        <Link
          href={`/calendar/month?year=${nextYear}&month=${nextMonth}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ color: "var(--color-ink-soft)" }}
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium"
            style={{ color: "var(--color-ink-muted)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.day) {
            return <div key={i} />;
          }

          const isToday = cell.dateStr === today;
          const eventCount = cell.dateStr ? eventCounts[cell.dateStr] || 0 : 0;

          return (
            <Link
              key={i}
              href={`/calendar/day?date=${cell.dateStr}`}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors hover:bg-[var(--color-paper-2)]"
              style={{
                borderColor: isToday ? "var(--color-accent)" : "var(--color-paper-3)",
                backgroundColor: isToday ? "var(--color-accent-faint)" : "var(--color-paper)",
              }}
            >
              <span
                className="font-medium"
                style={{ color: isToday ? "var(--color-accent)" : "var(--color-ink)" }}
              >
                {cell.day}
              </span>
              {eventCount > 0 && (
                <span
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--color-accent)" }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {loading && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Loading events...
        </p>
      )}

      {/* Today link */}
      <div className="mt-6 text-center">
        <Link
          href="/calendar/day"
          className="text-sm font-medium underline underline-offset-4"
          style={{ color: "var(--color-accent)" }}
        >
          Go to today
        </Link>
      </div>
    </div>
  );
}
