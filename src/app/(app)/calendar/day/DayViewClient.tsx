"use client";

import { useState, useEffect } from "react";
import { Plus, X, MapPin, Repeat } from "lucide-react";
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

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM (all 24 hours)
const HOUR_HEIGHT = 56; // px per hour
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

// Color palette for reminders — each reminder gets a distinct color
const REMINDER_COLORS = [
  "#c2410c", // burnt orange
  "#0e7490", // teal
  "#7c3aed", // violet
  "#be185d", // rose
  "#15803d", // forest green
  "#b45309", // amber
  "#1e40af", // deep blue
  "#9f1239", // crimson
];

const TYPE_COLORS: Record<string, string> = {
  block: "var(--color-accent)",
  task: "var(--color-warmth)",
  reminder: "var(--color-ink-muted)",
};

const TYPE_BG: Record<string, string> = {
  block: "color-mix(in oklab, var(--color-accent) 14%, transparent)",
  task: "color-mix(in oklab, var(--color-warmth) 14%, transparent)",
  reminder: "transparent",
};

// Deterministic color assignment for reminders based on title
function getReminderColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  return REMINDER_COLORS[Math.abs(hash) % REMINDER_COLORS.length];
}

export default function DayViewClient({ date }: { date: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newType, setNewType] = useState<"block" | "task" | "reminder">("block");
  const [enableRecurrence, setEnableRecurrence] = useState(false);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
          // Filter to only events that fall on this date in the user's local timezone
          // The API returns a wider window to handle timezone offsets
          const filtered = eventsData.filter((e: { startAt: string }) => {
            const d = new Date(e.startAt);
            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return localDateStr === date;
          });
          if (!cancelled) setEvents(filtered);
        }

        if (prayerRes?.ok) {
          const prayerData = await prayerRes.json();
          if (!cancelled) setPrayerTimes(prayerData);
        } else {
          if (!cancelled) setPrayerTimes(null);
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

  // Separate blocks (take time slots) from reminders (lines)
  const blockEvents = events.filter((e) => e.type !== "reminder");
  const reminderEvents = events.filter((e) => e.type === "reminder");

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

    // For blocks/tasks, validate end > start
    if (newType !== "reminder" && timeToMinutes(newEnd) <= timeToMinutes(newStart)) {
      setError("End time must be after start time.");
      return;
    }

    // Convert local times to proper ISO strings (with timezone offset)
    // so the server stores correct UTC timestamps regardless of server timezone
    const startISO = new Date(`${date}T${newStart}:00`).toISOString();
    const endISO = newType === "reminder"
      ? new Date(`${date}T${newStart}:00`).toISOString()
      : new Date(`${date}T${newEnd}:00`).toISOString();

    // Add recurrence end date if enabled
    const body: Record<string, unknown> = {
      title: newTitle,
      startAt: startISO,
      endAt: endISO,
      type: newType,
    };
    if (enableRecurrence && recurrenceEndDate) {
      body.recurrenceEndDate = recurrenceEndDate;
      if (recurrenceDays.length > 0) {
        body.recurrenceDays = recurrenceDays;
      }
    }

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        // If recurring, API returns { created, events }
        if (data.events && Array.isArray(data.events)) {
          // Refetch events for this date to get the ones that landed on today
          const refetch = await fetch(`/api/events?date=${date}`);
          if (refetch.ok) {
            const refreshed = await refetch.json();
            setEvents(refreshed);
          }
          setSuccessMsg(`Created ${data.created} recurring events.`);
        } else {
          // Single event
          setEvents([...events, data]);
          setSuccessMsg(null);
        }
        setShowAddForm(false);
        setNewTitle("");
        setEnableRecurrence(false);
        setRecurrenceEndDate("");
        setRecurrenceDays([]);
        setError(null);
        // Clear success message after 3 seconds
        if (data.events) {
          setTimeout(() => setSuccessMsg(null), 3000);
        }
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
      {/* Prayer times bar */}
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

      {/* Success message */}
      {successMsg && (
        <div
          className="mb-3 rounded-xl border p-3 text-sm sm:mb-4"
          style={{ borderColor: "var(--color-success)", backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)", color: "var(--color-success)" }}
        >
          {successMsg}
        </div>
      )}

      {/* Day grid */}
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

          {/* Prayer time lines — colored line with label pill */}
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

          {/* Reminder lines — each reminder is a horizontal line with its own color */}
          {reminderEvents.map((event) => {
            const startStr = isoToLocalTime(event.startAt);
            const minutes = timeToMinutes(startStr);
            if (minutes < HOURS[0] * 60 || minutes > (HOURS[HOURS.length - 1] + 1) * 60) return null;
            const top = minutesToTop(minutes);
            const color = getReminderColor(event.title);

            return (
              <div
                key={event.id}
                className="absolute z-15 flex items-center group"
                style={{ top: top - 7, left: TIME_COL, right: 0 }}
              >
                <div className="h-0.5 flex-1" style={{ backgroundColor: color, opacity: 0.7 }} />
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:px-2 sm:text-[10px]"
                  style={{
                    backgroundColor: "var(--color-paper)",
                    color: color,
                    border: `1px solid ${color}`,
                  }}
                >
                  {event.title} · {formatTime(startStr)}
                </span>
                <div className="h-0.5 w-3 sm:w-4" style={{ backgroundColor: color, opacity: 0.7 }} />
                {/* Delete button — appears on hover */}
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="ml-1 hidden shrink-0 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                  aria-label="Delete reminder"
                  style={{ color: "var(--color-ink-muted)" }}
                >
                  <X className="h-3 w-3" />
                </button>
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
                setNewType("block");
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

          {/* Block events — take up time slots */}
          {blockEvents.map((event) => {
            const startStr = isoToLocalTime(event.startAt);
            const endStr = isoToLocalTime(event.endAt);
            const startMin = timeToMinutes(startStr);
            const endMin = timeToMinutes(endStr);
            const top = minutesToTop(startMin);
            const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 22);

            const overlapping = getOverlappingEvents(event, blockEvents).sort((a, b) => {
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
                  left: `calc(${TIME_COL}px + (100% - ${TIME_COL}px) * ${leftPct / 100})`,
                  width: `calc((100% - ${TIME_COL}px) * ${widthPct / 100} - 3px)`,
                  backgroundColor: bgColor,
                  borderColor,
                  borderLeftWidth: 3,
                }}
              >
                <div className="flex h-full items-center justify-between gap-1">
                  <p className="min-w-0 flex-1 truncate text-center text-[11px] font-medium leading-tight sm:text-xs" style={{ color: "var(--color-ink)" }}>
                    {event.title}
                  </p>
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
          setNewType("block");
          setEnableRecurrence(false);
          setRecurrenceEndDate("");
          setRecurrenceDays([]);
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

      {/* Add event form — compact inline section */}
      {showAddForm && (
        <form
          onSubmit={handleAddEvent}
          className="mt-3 w-full max-w-sm rounded-2xl border p-4 sm:mt-4 sm:p-5"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
            <div className="flex flex-col gap-3">
              {/* Title */}
              <input
                type="text"
                placeholder="What's this about?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
              />

              {/* Type toggle: Block vs Reminder */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType("block")}
                  className="rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor: newType === "block" ? "var(--color-ink)" : "var(--color-paper-3)",
                    backgroundColor: newType === "block" ? "var(--color-ink)" : "var(--color-paper-2)",
                    color: newType === "block" ? "var(--color-paper)" : "var(--color-ink-soft)",
                    minHeight: 36,
                  }}
                >
                  Block
                </button>
                <button
                  type="button"
                  onClick={() => setNewType("reminder")}
                  className="rounded-lg border-2 px-2 py-2 text-xs font-medium transition-colors"
                  style={{
                    borderColor: newType === "reminder" ? "var(--color-ink)" : "var(--color-paper-3)",
                    backgroundColor: newType === "reminder" ? "var(--color-ink)" : "var(--color-paper-2)",
                    color: newType === "reminder" ? "var(--color-paper)" : "var(--color-ink-soft)",
                    minHeight: 36,
                  }}
                >
                  Reminder
                </button>
              </div>

              {/* Time inputs — hide end time for reminders */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
                  />
                </div>
                {newType !== "reminder" && (
                  <div className="flex-1">
                    <input
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
                    />
                  </div>
                )}
              </div>

              {/* Recurrence option */}
              <div
                className="rounded-lg border p-2.5"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableRecurrence}
                    onChange={(e) => {
                      setEnableRecurrence(e.target.checked);
                      if (e.target.checked && recurrenceDays.length === 0) {
                        // Default to the current day of the week
                        const dow = new Date(date + "T00:00:00").getDay();
                        setRecurrenceDays([dow]);
                      }
                    }}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                    <Repeat className="h-3.5 w-3.5" style={{ color: "var(--color-ink-muted)" }} />
                    Repeat
                  </span>
                </label>

                {enableRecurrence && (
                  <div className="mt-2.5 flex flex-col gap-2.5">
                    {/* Day-of-week picker */}
                    <div>
                      <div className="flex gap-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((dayLabel, idx) => {
                          const isSelected = recurrenceDays.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setRecurrenceDays(recurrenceDays.filter((d) => d !== idx));
                                } else {
                                  setRecurrenceDays([...recurrenceDays, idx].sort((a, b) => a - b));
                                }
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-medium transition-colors sm:h-9 sm:w-9"
                              style={{
                                backgroundColor: isSelected ? "var(--color-ink)" : "var(--color-paper)",
                                color: isSelected ? "var(--color-paper)" : "var(--color-ink-muted)",
                                border: `1px solid ${isSelected ? "var(--color-ink)" : "var(--color-paper-3)"}`,
                              }}
                              aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][idx]}
                            >
                              {dayLabel}
                            </button>
                          );
                        })}
                      </div>
                      {recurrenceDays.length === 0 && (
                        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-error)" }}>
                          Select at least one day.
                        </p>
                      )}
                    </div>

                    {/* End date */}
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      required={enableRecurrence}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 40 }}
                    />

                    {/* Summary */}
                    {recurrenceDays.length > 0 && recurrenceEndDate && (
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
                        Every{" "}
                        {recurrenceDays
                          .sort((a, b) => a - b)
                          .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                          .join(", ")}{" "}
                        until {new Date(recurrenceEndDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enableRecurrence && (recurrenceDays.length === 0 || !recurrenceEndDate)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
                >
                  {enableRecurrence ? "Add recurring" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 44 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
      )}
    </div>
  );
}
