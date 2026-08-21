"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Calendar } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: "block" | "task" | "reminder";
}

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM
const HOUR_HEIGHT = 64;

const PRAYER_NAMES: Array<{
  key: keyof PrayerTimes;
  label: string;
  arabic: string;
  color: string;
}> = [
  { key: "fajr", label: "Fajr", arabic: "الفجر", color: "var(--color-accent)" },
  { key: "sunrise", label: "Sunrise", arabic: "الشروق", color: "var(--color-warmth)" },
  { key: "dhuhr", label: "Dhuhr", arabic: "الظهر", color: "var(--color-accent)" },
  { key: "asr", label: "Asr", arabic: "العصر", color: "var(--color-accent)" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب", color: "var(--color-warmth)" },
  { key: "isha", label: "Isha", arabic: "العشاء", color: "var(--color-accent)" },
];

type View = "day" | "month";

export default function PublicCalendarClient({ token }: { token: string }) {
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  function navigateToDay(dateStr: string) {
    setSelectedDate(dateStr);
    setView("day");
  }

  return (
    <div className="min-h-screen overflow-x-clip" style={{ backgroundColor: "var(--color-paper-2)" }}>
      {/* ── Header ── */}
      <header
        className="border-b"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "var(--color-ink)" }}
            >
              <Eye className="h-4 w-4" style={{ color: "var(--color-paper)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
                Shared calendar
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                Read-only view
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div
            className="flex rounded-md border"
            style={{ borderColor: "var(--color-paper-3)" }}
          >
            <button
              onClick={() => setView("day")}
              className="flex items-center gap-1.5 rounded-l-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: view === "day" ? "var(--color-ink)" : "transparent",
                color: view === "day" ? "var(--color-paper)" : "var(--color-ink-muted)",
              }}
            >
              <Calendar className="h-3 w-3" />
              Day
            </button>
            <button
              onClick={() => setView("month")}
              className="flex items-center gap-1.5 rounded-r-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: view === "month" ? "var(--color-ink)" : "transparent",
                color: view === "month" ? "var(--color-paper)" : "var(--color-ink-muted)",
              }}
            >
              <Calendar className="h-3 w-3" />
              Month
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="py-6">
        {view === "day" ? (
          <PublicDayView
            token={token}
            date={selectedDate}
            onNavigateToMonth={() => setView("month")}
            onDateChange={setSelectedDate}
          />
        ) : (
          <PublicMonthView
            token={token}
            year={year}
            month={month}
            onNavigateToDay={navigateToDay}
            onPrevMonth={() => {
              const prevMonth = month === 1 ? 12 : month - 1;
              const prevYear = month === 1 ? year - 1 : year;
              setMonth(prevMonth);
              setYear(prevYear);
            }}
            onNextMonth={() => {
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              setMonth(nextMonth);
              setYear(nextYear);
            }}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="border-t px-5 py-6 text-center sm:px-6"
        style={{ borderColor: "var(--color-paper-3)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
          This is a read-only shared calendar from <span style={{ color: "var(--color-ink-soft)" }}>Waqt</span> — a prayer-centered life tracker.
        </p>
        <Link
          href="/"
          className="mt-2 inline-block text-xs font-medium underline underline-offset-4"
          style={{ color: "var(--color-accent)" }}
        >
          Learn more about Waqt
        </Link>
      </footer>
    </div>
  );
}

// ─── Public Day View (read-only) ───

function PublicDayView({ token, date, onNavigateToMonth, onDateChange }: { token: string; date: string; onNavigateToMonth: () => void; onDateChange: (date: string) => void }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [eventsRes, prayerRes] = await Promise.all([
          fetch(`/api/public/${token}/events?date=${date}`),
          fetch(`/api/public/${token}/prayer-times?date=${date}`).catch(() => null),
        ]);

        if (cancelled) return;

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          if (!cancelled) setEvents(eventsData);
        } else if (eventsRes.status === 404) {
          if (!cancelled) setError("Calendar not found.");
        } else {
          if (!cancelled) setEvents([]);
        }

        if (prayerRes?.ok) {
          const prayerData = await prayerRes.json();
          if (!cancelled) setPrayerTimes(prayerData);
        } else {
          if (!cancelled) setPrayerTimes(null);
        }

        if (!cancelled) setError(null);
      } catch {
        if (!cancelled) setError("Failed to load calendar.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, date]);

  function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesToTop(minutes: number): number {
    const startMinutes = HOURS[0] * 60;
    return ((minutes - startMinutes) / 60) * HOUR_HEIGHT;
  }

  function isoToLocalTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "00:00";
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  function getOverlappingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
    const start = timeToMinutes(isoToLocalTime(event.startAt));
    const end = timeToMinutes(isoToLocalTime(event.endAt));
    return allEvents.filter((e) => {
      const eStart = timeToMinutes(isoToLocalTime(e.startAt));
      const eEnd = timeToMinutes(isoToLocalTime(e.endAt));
      return eStart < end && eEnd > start;
    });
  }

  // Date navigation
  const currentDate = new Date(date + "T00:00:00");
  const prevDate = new Date(currentDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
  const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      {/* Date navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => onDateChange(prevDateStr)}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            {formattedDate}
          </h1>
          <button
            onClick={onNavigateToMonth}
            className="mt-0.5 text-xs underline underline-offset-2"
            style={{ color: "var(--color-ink-muted)" }}
          >
            View month
          </button>
        </div>
        <button
          onClick={() => onDateChange(nextDateStr)}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Prayer times bar (read-only — no check-in buttons) */}
      {prayerTimes && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {PRAYER_NAMES.filter((p) => p.key !== "sunrise").map((prayer) => (
            <div
              key={prayer.key}
              className="flex shrink-0 flex-col items-center gap-1 rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                {prayer.label}
              </span>
              <span className="text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
                {prayerTimes[prayer.key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Day grid */}
      <div className="relative overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-paper-3)" }}>
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT, backgroundColor: "var(--color-paper)" }}>
          {/* Hour lines */}
          {HOURS.map((hour, i) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <div
                className="w-14 shrink-0 pt-1 pr-2 text-right text-[10px] font-medium tabular-nums"
                style={{ color: "var(--color-ink-muted)" }}
              >
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
              <div
                className="flex-1 border-t"
                style={{ borderColor: "var(--color-paper-3)" }}
              />
            </div>
          ))}

          {/* Prayer bands */}
          {prayerTimes &&
            PRAYER_NAMES.map((prayer) => {
              const time = prayerTimes[prayer.key];
              if (!time) return null;
              const minutes = timeToMinutes(time);
              if (minutes < HOURS[0] * 60 || minutes > (HOURS[HOURS.length - 1] + 1) * 60) return null;
              const top = minutesToTop(minutes);
              return (
                <div
                  key={prayer.key}
                  className="absolute left-14 right-0 z-10 flex items-center gap-2"
                  style={{ top: top - 10 }}
                >
                  <div className="h-px flex-1" style={{ backgroundColor: prayer.color, opacity: 0.4 }} />
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: "color-mix(in oklab, var(--color-paper) 90%, transparent)",
                      color: prayer.color,
                    }}
                  >
                    {prayer.label} · {time}
                  </span>
                  <div className="h-px w-4" style={{ backgroundColor: prayer.color, opacity: 0.4 }} />
                </div>
              );
            })}

          {/* Events (read-only — no delete buttons, no tap-to-add) */}
          {events.map((event) => {
            const startStr = isoToLocalTime(event.startAt);
            const endStr = isoToLocalTime(event.endAt);
            const startMin = timeToMinutes(startStr);
            const endMin = timeToMinutes(endStr);
            const top = minutesToTop(startMin);
            const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);

            const overlapping = getOverlappingEvents(event, events).sort((a, b) => {
              const aStart = timeToMinutes(isoToLocalTime(a.startAt));
              const bStart = timeToMinutes(isoToLocalTime(b.startAt));
              return aStart - bStart;
            });
            const index = overlapping.findIndex((e) => e.id === event.id);
            const widthPct = 100 / overlapping.length;
            const leftPct = index * widthPct;

            const typeColors: Record<string, string> = {
              block: "var(--color-accent)",
              task: "var(--color-warmth)",
              reminder: "var(--color-ink-muted)",
            };

            return (
              <div
                key={event.id}
                className="absolute z-20 overflow-hidden rounded-lg border p-2 text-xs"
                style={{
                  top,
                  height,
                  left: `calc(3.5rem + ${leftPct} / 100 * (100% - 3.5rem))`,
                  width: `calc(${widthPct} / 100 * (100% - 3.5rem) - 4px)`,
                  backgroundColor: "color-mix(in oklab, var(--color-paper) 85%, transparent)",
                  borderColor: typeColors[event.type] || "var(--color-accent)",
                  borderLeftWidth: 3,
                }}
              >
                <p className="truncate font-medium" style={{ color: "var(--color-ink)" }}>
                  {event.title}
                </p>
                <p className="text-[10px] tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
                  {startStr} – {endStr}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty state */}
      {!loading && events.length === 0 && !error && (
        <div
          className="mt-4 rounded-lg border border-dashed py-8 text-center text-sm"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
        >
          No events scheduled for this day.
        </div>
      )}

      {loading && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
      )}
      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
      )}
    </div>
  );
}

// ─── Public Month View (read-only) ───

function PublicMonthView({ token, year, month, onNavigateToDay, onPrevMonth, onNextMonth }: {
  token: string;
  year: number;
  month: number;
  onNavigateToDay: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fromStr = `${year}-${String(month).padStart(2, "0")}-01`;
        const daysInMonth = new Date(year, month, 0).getDate();
        const toStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

        const res = await fetch(`/api/public/${token}/events?from=${fromStr}&to=${toStr}`);
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
  }, [token, year, month]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateStr });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      {/* Month navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {monthNames[month - 1]} {year}
        </h1>
        <button
          onClick={onNextMonth}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper)]"
          style={{ color: "var(--color-ink-soft)" }}
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
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
            <button
              key={i}
              onClick={() => cell.dateStr && onNavigateToDay(cell.dateStr)}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors hover:bg-[var(--color-paper)]"
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
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Loading events...
        </p>
      )}
    </div>
  );
}
