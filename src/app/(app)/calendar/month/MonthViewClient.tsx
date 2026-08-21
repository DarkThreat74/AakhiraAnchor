"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: "block" | "task" | "reminder";
}

export default function MonthViewClient({ year, month }: { year: number; month: number }) {
  const [eventsByDate, setEventsByDate] = useState<Record<string, CalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fromStr = `${year}-${String(month).padStart(2, "0")}-01`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const toStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const res = await fetch(`/api/events?from=${fromStr}&to=${toStr}`);
        if (res.ok && !cancelled) {
          const events: CalendarEvent[] = await res.json();
          const grouped: Record<string, CalendarEvent[]> = {};
          for (const event of events) {
            const eventDate = event.startAt.split("T")[0];
            if (!grouped[eventDate]) grouped[eventDate] = [];
            grouped[eventDate].push(event);
          }
          // Sort each day's events by start time
          for (const date of Object.keys(grouped)) {
            grouped[date].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
          }
          if (!cancelled) setEventsByDate(grouped);
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

  const typeColors: Record<string, string> = {
    block: "var(--color-accent)",
    task: "var(--color-warmth)",
    reminder: "var(--color-ink-muted)",
  };

  return (
    <div>
      {/* Month header with day/month toggle */}
      <div className="border-b" style={{ borderColor: "var(--color-paper-3)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          {/* Prev month */}
          <Link
            href={`/calendar/month?year=${prevYear}&month=${prevMonth}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          {/* Month name + view toggle */}
          <div className="flex flex-1 items-center justify-center gap-4">
            <h1 className="text-base font-semibold tracking-tight sm:text-lg" style={{ color: "var(--color-ink)" }}>
              {monthNames[month - 1]} {year}
            </h1>

            {/* Day/Month toggle */}
            <div
              className="flex rounded-lg border"
              style={{ borderColor: "var(--color-paper-3)" }}
            >
              <Link
                href="/calendar/day"
                className="rounded-l-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ color: "var(--color-ink-soft)" }}
              >
                Day
              </Link>
              <Link
                href={`/calendar/month?year=${year}&month=${month}`}
                className="rounded-r-lg px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
              >
                Month
              </Link>
            </div>
          </div>

          {/* Next month */}
          <Link
            href={`/calendar/month?year=${nextYear}&month=${nextMonth}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {/* Day headers */}
        <div className="mb-1 grid grid-cols-7 gap-1">
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

        {/* Calendar grid — responsive cell heights */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {cells.map((cell, i) => {
            if (!cell.day) {
              return <div key={i} className="min-h-[70px] sm:min-h-[100px] lg:min-h-[120px]" />;
            }

            const isToday = cell.dateStr === today;
            const dayEvents = cell.dateStr ? eventsByDate[cell.dateStr] || [] : [];

            return (
              <Link
                key={i}
                href={`/calendar/day?date=${cell.dateStr}`}
                className="flex min-h-[70px] flex-col rounded-lg border p-1 text-xs transition-colors hover:bg-[var(--color-paper-2)] sm:min-h-[100px] sm:p-1.5 lg:min-h-[120px]"
                style={{
                  borderColor: isToday ? "var(--color-accent)" : "var(--color-paper-3)",
                  backgroundColor: isToday ? "var(--color-accent-faint)" : "var(--color-paper)",
                }}
              >
                {/* Day number */}
                <span
                  className="mb-0.5 font-medium tabular-nums"
                  style={{
                    color: isToday ? "var(--color-accent)" : "var(--color-ink)",
                    fontSize: 11,
                  }}
                >
                  {cell.day}
                </span>

                {/* Event blocks — show up to 2, then "+N more" */}
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map((event) => {
                    const time = new Date(event.startAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    const color = typeColors[event.type] || "var(--color-accent)";
                    return (
                      <div
                        key={event.id}
                        className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight sm:text-[10px]"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
                          color: color,
                          borderLeft: `2px solid ${color}`,
                        }}
                      >
                        <span className="tabular-nums">{time}</span> {event.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span
                      className="px-1 text-[9px] font-medium sm:text-[10px]"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
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
    </div>
  );
}
