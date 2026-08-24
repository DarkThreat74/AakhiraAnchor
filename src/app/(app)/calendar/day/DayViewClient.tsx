"use client";

import { useState, useEffect } from "react";
import { Plus, X, MapPin, Repeat, ChevronDown, ChevronUp, Check } from "lucide-react";
import Link from "next/link";
import PrayerCheckinPopup from "@/components/prayer-checkin-popup";
import { getDisplayAsrTime, type PrayerKey } from "@/lib/prayer/checkin";

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: "block" | "task" | "reminder";
  color?: string | null;
  _pending?: boolean;
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
const DEFAULT_START_HOUR = 5; // 5 AM — default visible start

const PRAYER_NAMES: Array<{
  key: keyof PrayerTimes;
  label: string;
  color: string;
  isPrayer: boolean;
}> = [
  { key: "fajr", label: "Fajr", color: "var(--color-accent)", isPrayer: true },
  { key: "sunrise", label: "Sunrise", color: "var(--color-warmth)", isPrayer: false },
  { key: "dhuhr", label: "Dhuhr", color: "var(--color-accent)", isPrayer: true },
  { key: "asr", label: "Asr", color: "var(--color-accent)", isPrayer: true },
  { key: "maghrib", label: "Maghrib", color: "var(--color-warmth)", isPrayer: true },
  { key: "isha", label: "Isha", color: "var(--color-accent)", isPrayer: true },
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

// Color palette for event blocks — user-selectable
const EVENT_COLORS = [
  { label: "Teal", value: "#0e7490" },
  { label: "Orange", value: "#c2410c" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#be185d" },
  { label: "Green", value: "#15803d" },
  { label: "Amber", value: "#b45309" },
  { label: "Blue", value: "#1e40af" },
  { label: "Crimson", value: "#9f1239" },
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
  const [showEarlyHours, setShowEarlyHours] = useState(false);
  const [newColor, setNewColor] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CalendarEvent | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [prayerLogs, setPrayerLogs] = useState<Array<{ prayerName: string; status: string; wentToMasjid: boolean | null }>>([]);
  const [checkinPopup, setCheckinPopup] = useState<{ prayer: PrayerKey; label: string } | null>(null);
  const [userTimezone, setUserTimezone] = useState("America/Chicago");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [eventsRes, prayerRes, logRes] = await Promise.all([
          fetch(`/api/events?date=${date}`).catch(() => null),
          fetch(`/api/prayer-times?date=${date}`).catch(() => null),
          fetch(`/api/prayer-log?date=${date}`).catch(() => null),
        ]);

        if (cancelled) return;

        if (eventsRes?.ok) {
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

        // Parse prayer logs
        if (logRes?.ok) {
          const logData = await logRes.json();
          if (!cancelled) setPrayerLogs(logData);
        }

        // Fetch user timezone from settings
        try {
          const settingsRes = await fetch("/api/settings/prayer-settings");
          if (settingsRes.ok && !cancelled) {
            const settingsData = await settingsRes.json();
            if (settingsData.timezone) setUserTimezone(settingsData.timezone);
          }
        } catch {
          // Use default timezone
        }

        if (!cancelled) setError(null);
      } catch {
        // If offline, don't show an error — the SW will serve cached data
        // via the stale-while-revalidate strategy. Just silently fail.
        if (!cancelled && !navigator.onLine) {
          setError(null);
        } else if (!cancelled) {
          setError("Failed to load calendar data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [date]);

  // ── Online/offline + sync listeners ──
  useEffect(() => {
    // After mount, sync the real online status (avoids hydration mismatch)
    // Using a Promise to defer the setState outside the effect body
    Promise.resolve().then(() => {
      setMounted(true);
      setIsOnline(navigator.onLine);
    });

    const handleOnline = () => {
      setIsOnline(true);
      // Refetch events to get any synced changes
      (async () => {
        try {
          const res = await fetch(`/api/events?date=${date}`);
          if (res.ok) {
            const data = await res.json();
            const filtered = data.filter((e: { startAt: string }) => {
              const d = new Date(e.startAt);
              const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return localDateStr === date;
            });
            setEvents(filtered);
          }
        } catch {
          // ignore
        }
      })();
    };
    const handleOffline = () => setIsOnline(false);

    const handleSynced = () => {
      // Events were synced from the outbox — refetch to get real data
      (async () => {
        try {
          const res = await fetch(`/api/events?date=${date}`);
          if (res.ok) {
            const data = await res.json();
            const filtered = data.filter((e: { startAt: string }) => {
              const d = new Date(e.startAt);
              const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return localDateStr === date;
            });
            setEvents(filtered);
            setError(null);
          }
        } catch {
          // ignore
        }
      })();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("waqt:events-synced", handleSynced);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("waqt:events-synced", handleSynced);
    };
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
    if (hour === 0) return "12a";
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
      color: newColor,
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

        // Offline response — event was queued in the SW outbox
        if (data.offline && data._pending) {
          // Add the temporary event to the UI so it shows immediately
          const tempEvent: CalendarEvent = {
            id: data.id,
            title: data.title,
            startAt: data.startAt,
            endAt: data.endAt,
            type: data.type,
            color: data.color,
            _pending: true,
          };
          // Only add if it falls on the currently viewed date
          const d = new Date(tempEvent.startAt);
          const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (localDateStr === date) {
            setEvents([...events, tempEvent]);
          }
          setSuccessMsg("Saved offline — will sync when online.");
          setShowAddForm(false);
          setNewTitle("");
          setNewColor(null);
          setEnableRecurrence(false);
          setRecurrenceEndDate("");
          setRecurrenceDays([]);
          setError(null);
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }

        // If recurring, API returns { created, events }
        if (data.events && Array.isArray(data.events)) {
          // Clear SW API cache then refetch events for this date
          if ("caches" in window) {
            await caches.keys().then((names) => Promise.all(names.filter((n) => n.includes("-api")).map((n) => caches.delete(n))));
          }
          const refetch = await fetch(`/api/events?date=${date}`);
          if (refetch.ok) {
            const refreshed = await refetch.json();
            const filtered = refreshed.filter((e: { startAt: string }) => {
              const d = new Date(e.startAt);
              const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return localDateStr === date;
            });
            setEvents(filtered);
          }
          setSuccessMsg(`Created ${data.created} recurring events.`);
        } else {
          // Single event
          setEvents([...events, data]);
          // Clear SW API cache so next refetch includes the new event
          if ("caches" in window) {
            caches.keys().then((names) => {
              names.forEach((n) => { if (n.includes("-api")) caches.delete(n); });
            });
          }
          setSuccessMsg(null);
        }
        setShowAddForm(false);
        setNewTitle("");
        setNewColor(null);
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
    // If it's a pending offline event, just remove it from local state
    if (id.startsWith("offline-")) {
      setEvents(events.filter((e) => e.id !== id));
      return;
    }
    // Optimistically remove from UI immediately
    setEvents(events.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Clear the SW API cache so stale events data isn't served on next refetch
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((n) => {
              if (n.includes("-api")) caches.delete(n);
            });
          });
        }
      } else {
        // Delete failed — refetch to restore the event
        const refetch = await fetch(`/api/events?date=${date}`);
        if (refetch.ok) {
          const data = await refetch.json();
          const filtered = data.filter((e: { startAt: string }) => {
            const d = new Date(e.startAt);
            const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return localDateStr === date;
          });
          setEvents(filtered);
        }
      }
    } catch {
      // Network error — event stays removed from UI (offline queue will handle it)
    }
  }

  async function handleUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEvent || !newTitle.trim()) return;

    if (newType !== "reminder" && timeToMinutes(newEnd) <= timeToMinutes(newStart)) {
      setError("End time must be after start time.");
      return;
    }

    const startISO = new Date(`${date}T${newStart}:00`).toISOString();
    const endISO = newType === "reminder"
      ? new Date(`${date}T${newStart}:00`).toISOString()
      : new Date(`${date}T${newEnd}:00`).toISOString();

    try {
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          startAt: startISO,
          endAt: endISO,
          type: newType,
          color: newColor,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Offline response — update was queued in the SW outbox
        if (updated.offline) {
          // Update the local event with the new values and mark as pending
          const localUpdated: CalendarEvent = {
            ...editingEvent,
            title: newTitle,
            startAt: startISO,
            endAt: endISO,
            type: newType,
            color: newColor,
            _pending: true,
          };
          setEvents(events.map((e) => (e.id === editingEvent.id ? localUpdated : e)));
          setSuccessMsg("Saved offline — will sync when online.");
          setEditingEvent(null);
          setNewTitle("");
          setNewColor(null);
          setError(null);
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
        setEvents(events.map((e) => (e.id === editingEvent.id ? updated : e)));
        // Clear SW API cache so stale events data isn't served on next refetch
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((n) => { if (n.includes("-api")) caches.delete(n); });
          });
        }
        setEditingEvent(null);
        setNewTitle("");
        setNewColor(null);
        setError(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update event.");
      }
    } catch {
      setError("Network error.");
    }
  }

  function openEditForm(event: CalendarEvent) {
    const startStr = isoToLocalTime(event.startAt);
    const endStr = isoToLocalTime(event.endAt);
    setEditingEvent(event);
    setNewTitle(event.title);
    setNewStart(startStr);
    setNewEnd(endStr);
    setNewType(event.type);
    setNewColor(event.color || null);
    setEnableRecurrence(false);
    setRecurrenceEndDate("");
    setRecurrenceDays([]);
    setError(null);
    setShowAddForm(false);
  }

  function closeForm() {
    setShowAddForm(false);
    setEditingEvent(null);
    setNewTitle("");
    setNewColor(null);
    setError(null);
    setEnableRecurrence(false);
    setRecurrenceEndDate("");
    setRecurrenceDays([]);
  }

  return (
    <div className="mx-auto max-w-5xl px-2 py-3 sm:px-6 sm:py-6">
      {/* Offline banner — only show after mount to avoid hydration mismatch */}
      {mounted && !isOnline && (
        <div
          className="mb-3 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium sm:mb-4"
          style={{
            borderColor: "var(--color-warmth)",
            backgroundColor: "color-mix(in oklab, var(--color-warmth) 10%, transparent)",
            color: "var(--color-warmth)",
          }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-warmth)" }} />
          You&apos;re offline — changes will sync when you reconnect.
        </div>
      )}

      {/* Prayer times bar */}
      {prayerTimes && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 sm:mb-4 sm:flex-wrap sm:overflow-visible">
          {PRAYER_NAMES.map((prayer) => {
            const rawTime = prayerTimes[prayer.key];
            if (!rawTime) return null;
            // Asr time: display API time + 1 hour
            const time = prayer.key === "asr" ? getDisplayAsrTime(rawTime) : rawTime;
            const log = prayerLogs.find((l) => l.prayerName === prayer.key);
            const isPrayed = log?.status === "prayed" || log?.status === "assumed_prayed";
            const isClickable = prayer.isPrayer;
            return (
              <button
                key={prayer.key}
                onClick={isClickable ? () => setCheckinPopup({ prayer: prayer.key as PrayerKey, label: prayer.label }) : undefined}
                className="flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2.5 py-1.5 transition-colors sm:px-3"
                style={{
                  borderColor: isPrayed ? "var(--color-success)" : "var(--color-paper-3)",
                  backgroundColor: isPrayed ? "color-mix(in oklab, var(--color-success) 8%, var(--color-paper))" : "var(--color-paper)",
                  cursor: isClickable ? "pointer" : "default",
                }}
                disabled={!isClickable}
              >
                <span className="flex items-center gap-1 text-[11px] font-medium sm:text-xs" style={{ color: prayer.color }}>
                  {prayer.label}
                  {isPrayed && <Check className="h-3 w-3" style={{ color: "var(--color-success)" }} />}
                </span>
                <span className="text-[10px] tabular-nums sm:text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                  {formatTime(time)}
                </span>
              </button>
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
        {/* View More / Hide button for early hours */}
        <button
          onClick={() => setShowEarlyHours(!showEarlyHours)}
          className="flex w-full items-center justify-center gap-1 border-b py-1.5 text-[11px] font-medium"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
        >
          {showEarlyHours ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide 12 AM – 4 AM
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show 12 AM – 4 AM
            </>
          )}
        </button>
        {/* Grid container — clips early hours when collapsed */}
        <div
          className="relative overflow-hidden"
          style={{
            height: showEarlyHours
              ? HOURS.length * HOUR_HEIGHT
              : (HOURS.length - DEFAULT_START_HOUR) * HOUR_HEIGHT,
          }}
        >
          <div
            className="relative"
            style={{
              height: HOURS.length * HOUR_HEIGHT,
              transform: showEarlyHours ? "none" : `translateY(-${DEFAULT_START_HOUR * HOUR_HEIGHT}px)`,
            }}
          >
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
              const rawTime = prayerTimes[prayer.key];
              if (!rawTime) return null;
              // Asr time: display API time + 1 hour
              const time = prayer.key === "asr" ? getDisplayAsrTime(rawTime) : rawTime;
              const minutes = timeToMinutes(time);
              if (minutes < HOURS[0] * 60 || minutes > (HOURS[HOURS.length - 1] + 1) * 60) return null;
              const top = minutesToTop(minutes);
              const log = prayerLogs.find((l) => l.prayerName === prayer.key);
              const isPrayed = log?.status === "prayed" || log?.status === "assumed_prayed";
              const isClickable = prayer.isPrayer;
              return (
                <div
                  key={prayer.key}
                  className="absolute z-30 flex items-center"
                  style={{ top: top - 7, left: TIME_COL, right: 0 }}
                >
                  <div className="h-px flex-1" style={{ backgroundColor: prayer.color, opacity: 0.5 }} />
                  <button
                    onClick={isClickable ? (e: React.MouseEvent) => { e.stopPropagation(); setCheckinPopup({ prayer: prayer.key as PrayerKey, label: prayer.label }); } : undefined}
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-transform sm:px-2 sm:text-[10px]"
                    style={{
                      backgroundColor: isPrayed ? "color-mix(in oklab, var(--color-success) 10%, var(--color-paper))" : "var(--color-paper)",
                      color: prayer.color,
                      border: `1px solid ${isPrayed ? "var(--color-success)" : prayer.color}`,
                      cursor: isClickable ? "pointer" : "default",
                    }}
                  >
                    {prayer.label} {formatTime(time)}
                    {isPrayed && " ✓"}
                  </button>
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
                className="absolute z-25 flex items-center group"
                style={{ top: top - 7, left: TIME_COL, right: 0 }}
              >
                <div className="h-0.5 flex-1" style={{ backgroundColor: color, opacity: 0.7 }} />
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEditForm(event); }}
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-transform hover:scale-105 sm:px-2 sm:text-[10px]"
                  style={{
                    backgroundColor: "var(--color-paper)",
                    color: color,
                    border: `1px solid ${color}`,
                    cursor: "pointer",
                  }}
                >
                  {event.title} · {formatTime(startStr)}
                </button>
                <div className="h-0.5 w-3 sm:w-4" style={{ backgroundColor: color, opacity: 0.7 }} />
                {/* Delete button — appears on hover */}
                <button
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
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

            const eventColor = event.color && event.color.length >= 4 ? event.color : null;
            const borderColor = eventColor || TYPE_COLORS[event.type] || "var(--color-accent)";
            const bgColor = eventColor
              ? `color-mix(in oklab, ${eventColor} 18%, transparent)`
              : TYPE_BG[event.type] || TYPE_BG.block;

            return (
              <div
                key={event.id}
                onClick={() => openEditForm(event)}
                className="absolute z-20 cursor-pointer overflow-hidden rounded-lg border p-1.5 transition-opacity hover:opacity-80 sm:p-2"
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
                <div className="flex h-full flex-col items-center justify-between gap-0.5">
                  <div className="flex w-full items-center justify-between gap-1">
                    <p className="min-w-0 flex-1 truncate text-center text-[11px] font-medium leading-tight sm:text-xs" style={{ color: "var(--color-ink)" }}>
                      {event.title}
                      {event._pending && (
                        <span className="ml-1 inline-block text-[8px] align-middle" style={{ color: "var(--color-warmth)" }} title="Pending sync">
                          ●
                        </span>
                      )}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(event); }}
                      className="shrink-0 opacity-40 transition-opacity hover:opacity-100"
                      aria-label="Delete event"
                      style={{ minHeight: 28, minWidth: 28 }}
                    >
                      <X className="h-3 w-3" style={{ color: "var(--color-ink-muted)" }} />
                    </button>
                  </div>
                  {endStr && (
                    <p className="w-full truncate text-center text-[9px] font-normal leading-tight sm:text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                      {formatTime(startStr)} – {formatTime(endStr)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Add event button — always visible, 44px touch target */}
      <button
        onClick={() => {
          setNewTitle("");
          setNewStart("09:00");
          setNewEnd("10:00");
          setNewType("block");
          setNewColor(null);
          setEnableRecurrence(false);
          setRecurrenceEndDate("");
          setRecurrenceDays([]);
          setEditingEvent(null);
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

      {/* Add/Edit event form — compact inline section */}
      {(showAddForm || editingEvent) && (
        <form
          onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
          className="mt-3 w-full max-w-sm rounded-2xl border p-4 sm:mt-4 sm:p-5"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
            <div className="mb-2 text-xs font-semibold" style={{ color: "var(--color-ink-muted)" }}>
              {editingEvent ? "Edit event" : "New event"}
            </div>
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

              {/* Color picker */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewColor(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 text-[9px] font-medium"
                  style={{
                    borderColor: newColor === null ? "var(--color-ink)" : "var(--color-paper-3)",
                    backgroundColor: "var(--color-paper-2)",
                    color: "var(--color-ink-muted)",
                  }}
                  aria-label="Default color"
                  title="Default"
                >
                  Auto
                </button>
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewColor(c.value)}
                    className="h-7 w-7 rounded-full border-2"
                    style={{
                      backgroundColor: c.value,
                      borderColor: newColor === c.value ? "var(--color-ink)" : "transparent",
                    }}
                    aria-label={c.label}
                    title={c.label}
                  />
                ))}
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

              {/* Recurrence option — only for new events, not editing */}
              {!editingEvent && (
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
                          // Default to the current day of the week (in user's local timezone)
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
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enableRecurrence && (recurrenceDays.length === 0 || !recurrenceEndDate)}
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
                >
                  {editingEvent ? "Save" : enableRecurrence ? "Add recurring" : "Add"}
                </button>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(editingEvent)}
                    className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
                    style={{ borderColor: "var(--color-error)", color: "var(--color-error)", minHeight: 40 }}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border p-5 text-center"
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
          >
            <p className="mb-1 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Delete event?
            </p>
            <p className="mb-4 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              &ldquo;{deleteConfirm.title}&rdquo; will be permanently removed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleDeleteEvent(deleteConfirm.id);
                  setDeleteConfirm(null);
                  closeForm();
                }}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: "var(--color-error)", color: "var(--color-paper)", minHeight: 40 }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prayer check-in popup */}
      {checkinPopup && prayerTimes && (
        <PrayerCheckinPopup
          prayer={checkinPopup.prayer}
          prayerLabel={checkinPopup.label}
          date={date}
          timezone={userTimezone}
          timings={{
            fajr: prayerTimes.fajr,
            sunrise: prayerTimes.sunrise,
            dhuhr: prayerTimes.dhuhr,
            asr: prayerTimes.asr,
            maghrib: prayerTimes.maghrib,
            isha: prayerTimes.isha,
          }}
          existingStatus={prayerLogs.find((l) => l.prayerName === checkinPopup.prayer)?.status}
          onClose={() => setCheckinPopup(null)}
          onCheckedIn={(result) => {
            // Update local prayer logs state
            setPrayerLogs((prev) => {
              const filtered = prev.filter((l) => l.prayerName !== checkinPopup.prayer);
              return [...filtered, { prayerName: checkinPopup.prayer, status: result.status, wentToMasjid: result.wentToMasjid }];
            });
            setCheckinPopup(null);
          }}
        />
      )}
    </div>
  );
}
