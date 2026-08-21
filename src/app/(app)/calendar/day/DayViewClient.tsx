"use client";

import { useState, useEffect } from "react";
import { Plus, X, MapPin } from "lucide-react";
import Link from "next/link";

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
const HOUR_HEIGHT = 56; // px per hour — compact on mobile, still readable
const TIME_COL = 44; // px — time label column

const PRAYER_NAMES: Array<{
  key: keyof PrayerTimes;
  label: string;
  color: string;
}> = [
  { key: "fajr", label: "Fajr", color: "var(--color-accent)" },
  { key: "sunrise", label: "Sunrise", color: "var(--color-warmth)" },
  { key: "dhuhr", label: "Dhuhr", color: "var(--color-accent)" },
  { key: "asr", label: "Asr", color: "var(--color-accent)" },
  { key: "maghrib", label: "Maghrib", color: "var(--color-warmth)" },
  { key: "isha", label: "Isha", color: "var(--color-accent)" },
];

const TYPE_COLORS: Record<string, string> = {
  block: "var(--color-accent)",
  task: "var(--color-warmth)",
  reminder: "var(--color-ink-muted)",
};

const TYPE_BG: Record<string, string> = {
  block: "color-mix(in oklab, var(--color-accent) 12%, var(--color-paper))",
  task: "color-mix(in oklab, var(--color-warmth) 12%, var(--color-paper))",
  reminder: "color-mix(in oklab, var(--color-ink-muted) 12%, var(--color-paper))",
};

export default function DayViewClient({ date }: { date: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newType, setNewType] = useState<"block" | "task" | "reminder">("block");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [eventsRes, prayerRes] = await Promise.all([
          fetch(`/api/events?date=${date}`),
          fetch(`/api/prayer-times?date=${date}`).catch(() => null),
        ]);

        if (cancelled) return;

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          if (!cancelled) setEvents(eventsData);
        }

        if (prayerRes?.ok) {
          const prayerData = await prayerRes.json();
          if (!cancelled) setPrayerTimes(prayerData);
        } else {
          if (!cancelled) setPrayerTimes(null);
          // Auto-sync if no cached times
          try {
            const syncRes = await fetch("/api/prayer-times/sync", { method: "POST" });
            if (syncRes.ok && !cancelled) {
              const retryRes = await fetch(`/api/prayer-times?date=${date}`);
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (!cancelled) setPrayerTimes(retryData);
              }
            }
          } catch {
            // User needs to set location in settings
          }
        }

        if (!cancelled) setError(null);
      } catch {
        if (!cancelled) setError("Failed to load calendar data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [date]);

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

  function formatTime(time: string): string {
    if (!time) return "—";
    const [h, m] = time.split(":").map(Number);
    const hour = h % 12 || 12;
    const period = h < 12 ? "AM" : "PM";
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  }

  function formatHour(hour: number): string {
    if (hour === 12) return "12p";
    if (hour > 12) return `${hour - 12}p`;
    return `${hour}a`;
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

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (timeToMinutes(newEnd) <= timeToMinutes(newStart)) {
      setError("End time must be after start time.");
      return;
    }

    const startISO = `${date}T${newStart}:00`;
    const endISO = `${date}T${newEnd}:00`;

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, startAt: startISO, endAt: endISO, type: newType }),
      });

      if (res.ok) {
        const event = await res.json();
        setEvents([...events, event]);
        setShowAddForm(false);
        setNewTitle("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create event.");
      }
    } catch {
      setError("Network error.");
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(events.filter((e) => e.id !== id));
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-2 py-3 sm:px-6 sm:py-6">
      {/* Prayer times bar — horizontal scroll on mobile, wrap on desktop */}
      {prayerTimes && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sm:mb-4 sm:flex-wrap sm:overflow-visible">
          {PRAYER_NAMES.map((prayer) => {
            const time = prayerTimes[prayer.key];
            if (!time) return null;
            return (
              <div
                key={prayer.key}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 sm:px-3"
                style={{
                  borderColor: "var(--color-paper-3)",
                  backgroundColor: "var(--color-paper)",
                }}
              >
                <span className="text-[11px] font-medium sm:text-xs" style={{ color: prayer.color }}>
                  {prayer.label}
                </span>
                <span className="text-[10px] tabular-nums sm:text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                  {formatTime(time)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* No location message */}
      {!prayerTimes && !loading && (
        <div
          className="mb-3 flex items-center gap-2 rounded-xl border p-3 text-sm sm:mb-4"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-soft)" }}
        >
          <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
          <span>
            Set your location in{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2" style={{ color: "var(--color-accent)" }}>
              Settings
            </Link>{" "}
            to see prayer times.
          </span>
        </div>
      )}

      {/* Day grid — no horizontal scroll, fits all screen sizes */}
      <div
        className="relative overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--color-paper-3)" }}
      >
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Hour lines + labels */}
          {HOURS.map((hour, i) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <div
                className="shrink-0 pt-0.5 pr-1.5 text-right text-[10px] font-medium tabular-nums sm:pr-2"
                style={{ color: "var(--color-ink-muted)", width: TIME_COL }}
              >
                {formatHour(hour)}
              </div>
              <div
                className="flex-1 border-t"
                style={{ borderColor: "var(--color-paper-3)" }}
              />
            </div>
          ))}

          {/* Prayer time lines */}
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
                  className="absolute z-10 flex items-center"
                  style={{ top: top - 7, left: TIME_COL, right: 0 }}
                >
                  <div className="h-px flex-1" style={{ backgroundColor: prayer.color, opacity: 0.5 }} />
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:px-2 sm:text-[10px]"
                    style={{
                      backgroundColor: "var(--color-paper)",
                      color: prayer.color,
                      border: `1px solid ${prayer.color}`,
                    }}
                  >
                    {prayer.label} {formatTime(time)}
                  </span>
                </div>
              );
            })}

          {/* Tap-to-add zones — 44px touch targets */}
          {HOURS.map((hour, i) => (
            <button
              key={`add-${hour}`}
              className="absolute flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
              style={{
                top: i * HOUR_HEIGHT,
                height: HOUR_HEIGHT,
                left: TIME_COL,
                right: 0,
              }}
              onClick={() => {
                setNewStart(`${String(hour).padStart(2, "0")}:00`);
                setNewEnd(`${String(hour + 1).padStart(2, "0")}:00`);
                setShowAddForm(true);
              }}
              aria-label={`Add event at ${hour}:00`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--color-accent)", color: "var(--color-paper)" }}
              >
                <Plus className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}

          {/* Events */}
          {events.map((event) => {
            const startStr = isoToLocalTime(event.startAt);
            const endStr = isoToLocalTime(event.endAt);
            const startMin = timeToMinutes(startStr);
            const endMin = timeToMinutes(endStr);
            const top = minutesToTop(startMin);
            const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);

            const overlapping = getOverlappingEvents(event, events).sort((a, b) => {
              const aStart = timeToMinutes(isoToLocalTime(a.startAt));
              const bStart = timeToMinutes(isoToLocalTime(b.startAt));
              return aStart - bStart;
            });
            const index = overlapping.findIndex((e) => e.id === event.id);
            const widthPct = 100 / overlapping.length;
            const leftPct = index * widthPct;

            const borderColor = TYPE_COLORS[event.type] || "var(--color-accent)";
            const bgColor = TYPE_BG[event.type] || TYPE_BG.block;

            return (
              <div
                key={event.id}
                className="absolute z-20 overflow-hidden rounded-lg border p-1.5 sm:p-2"
                style={{
                  top,
                  height,
                  left: `calc(${TIME_COL}px + ${leftPct}% * (100% - ${TIME_COL}px) / 100)`,
                  width: `calc(${widthPct}% * (100% - ${TIME_COL}px) / 100 - 3px)`,
                  backgroundColor: bgColor,
                  borderColor,
                  borderLeftWidth: 3,
                }}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium leading-tight sm:text-xs" style={{ color: "var(--color-ink)" }}>
                      {event.title}
                    </p>
                    <p className="text-[9px] tabular-nums leading-tight sm:text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                      {formatTime(startStr)}–{formatTime(endStr)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="shrink-0 opacity-40 transition-opacity hover:opacity-100"
                    aria-label="Delete event"
                    style={{ minHeight: 28, minWidth: 28 }}
                  >
                    <X className="h-3 w-3" style={{ color: "var(--color-ink-muted)" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add event button — always visible, 44px touch target */}
      <button
        onClick={() => {
          setNewTitle("");
          setNewStart("09:00");
          setNewEnd("10:00");
          setShowAddForm(true);
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 44 }}
      >
        <Plus className="h-4 w-4" />
        Add event
      </button>

      {loading && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Loading...
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
      )}

      {/* Add event form — bottom sheet on mobile, centered modal on desktop */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setShowAddForm(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddEvent}
            className="w-full max-w-md rounded-t-2xl border p-5 sm:rounded-2xl sm:p-6"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
          >
            <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--color-ink)" }}>
              New event
            </h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Event title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
                className="rounded-lg border px-3 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Start</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "var(--color-ink-muted)" }}>End</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
                  />
                </div>
              </div>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "block" | "task" | "reminder")}
                className="rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 44 }}
              >
                <option value="block">Block</option>
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg px-4 py-3 text-sm font-medium"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 44 }}
                >
                  Add event
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 44 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
