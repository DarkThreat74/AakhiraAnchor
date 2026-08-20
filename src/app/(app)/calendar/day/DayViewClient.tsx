"use client";

import { useState, useEffect } from "react";
import { Plus, X, MapPin } from "lucide-react";

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

interface PrayerLogEntry {
  prayerName: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  status: "prayed" | "missed" | "pending" | "assumed_prayed";
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 AM to 10 PM
const HOUR_HEIGHT = 64; // px per hour

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

export default function DayViewClient({ date }: { date: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [prayerLog, setPrayerLog] = useState<PrayerLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [, setAddSlot] = useState<{ hour: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newType, setNewType] = useState<"block" | "task" | "reminder">("block");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [eventsRes, prayerRes, logRes] = await Promise.all([
          fetch(`/api/events?date=${date}`),
          fetch(`/api/prayer-times?date=${date}`).catch(() => null),
          fetch(`/api/prayer-log?date=${date}`).catch(() => null),
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
        }
        if (logRes?.ok) {
          const logData = await logRes.json();
          if (!cancelled) setPrayerLog(logData);
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

  function getOverlappingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
    const start = timeToMinutes(event.startAt.split("T")[1]?.slice(0, 5) || event.startAt.slice(11, 16));
    const end = timeToMinutes(event.endAt.split("T")[1]?.slice(0, 5) || event.endAt.slice(11, 16));
    return allEvents.filter((e) => {
      const eStart = timeToMinutes(e.startAt.split("T")[1]?.slice(0, 5) || e.startAt.slice(11, 16));
      const eEnd = timeToMinutes(e.endAt.split("T")[1]?.slice(0, 5) || e.endAt.slice(11, 16));
      return eStart < end && eEnd > start;
    });
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

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
        setAddSlot(null);
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

  async function handlePrayerCheckin(prayerName: PrayerLogEntry["prayerName"]) {
    try {
      const res = await fetch("/api/prayer-log/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, prayerName, status: "prayed" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setPrayerLog((prev) => {
          const filtered = prev.filter((p) => p.prayerName !== updated.prayerName);
          return [...filtered, updated];
        });
      }
    } catch {
      // ignore
    }
  }

  function getPrayerStatus(name: string): string {
    const entry = prayerLog.find((p) => p.prayerName === name);
    return entry?.status || "pending";
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Prayer status bar */}
      {prayerTimes && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {PRAYER_NAMES.filter((p) => p.key !== "sunrise").map((prayer) => {
            const status = getPrayerStatus(prayer.key);
            return (
              <button
                key={prayer.key}
                onClick={() => handlePrayerCheckin(prayer.key as PrayerLogEntry["prayerName"])}
                className="flex shrink-0 flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-colors hover:bg-[var(--color-paper-2)]"
                style={{
                  borderColor: status === "prayed" ? "var(--color-success)" : "var(--color-paper-3)",
                  backgroundColor: status === "prayed" ? "var(--color-accent-faint)" : "var(--color-paper)",
                }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                  {prayer.label}
                </span>
                <span className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                  {prayerTimes[prayer.key]}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: status === "prayed" ? "var(--color-success)" : "var(--color-ink-muted)",
                  }}
                >
                  {status === "prayed" ? "✓ Prayed" : "Tap to mark"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!prayerTimes && (
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-soft)" }}
        >
          <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
          Set your location in onboarding to see prayer times on the calendar.
        </div>
      )}

      {/* Day grid */}
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-paper-3)" }}>
        <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
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

          {/* Tap-to-add zones */}
          {HOURS.map((hour, i) => (
            <button
              key={`add-${hour}`}
              className="absolute left-14 right-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
              style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 - 12, height: 24 }}
              onClick={() => {
                setAddSlot({ hour });
                setNewStart(`${String(hour).padStart(2, "0")}:00`);
                setNewEnd(`${String(hour + 1).padStart(2, "0")}:00`);
                setShowAddForm(true);
              }}
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
            const startStr = event.startAt.split("T")[1]?.slice(0, 5) || event.startAt.slice(11, 16);
            const endStr = event.endAt.split("T")[1]?.slice(0, 5) || event.endAt.slice(11, 16);
            const startMin = timeToMinutes(startStr);
            const endMin = timeToMinutes(endStr);
            const top = minutesToTop(startMin);
            const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);

            // Calculate width for overlapping events
            const overlapping = getOverlappingEvents(event, events);
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
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" style={{ color: "var(--color-ink)" }}>
                      {event.title}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                      {startStr} – {endStr}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
                  >
                    <X className="h-3 w-3" style={{ color: "var(--color-ink-muted)" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>
          Loading...
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>
      )}

      {/* Add event form */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setShowAddForm(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddEvent}
            className="w-full max-w-md rounded-t-2xl border p-6 sm:rounded-2xl"
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
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Start</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "var(--color-ink-muted)" }}>End</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                  />
                </div>
              </div>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "block" | "task" | "reminder")}
                className="rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              >
                <option value="block">Block</option>
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
                >
                  Add event
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border px-4 py-2.5 text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
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
