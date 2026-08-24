"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Client-side notification scheduler.
 *
 * Schedules local notifications using the service worker's showNotification():
 * 1. Prayer time notifications — fires at each prayer's start time
 * 2. Reminder notifications — fires 15 min before each reminder's start time
 *
 * Does NOT request notification permission — that must be done from a user
 * gesture (button tap in Settings). This component only schedules if
 * permission is already granted.
 *
 * Works while the app is open or in a background tab.
 * Re-schedules when the page becomes visible or every 30 minutes.
 */

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startAt: string;
  type: "block" | "task" | "reminder";
}

const PRAYER_NOTIFICATIONS: Array<{ key: keyof PrayerTimes; label: string }> = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

export default function NotificationScheduler() {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const showNotification = useCallback(async (title: string, body: string, tag: string, url: string) => {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.showNotification(title, {
          body,
          tag,
          data: { url },
          icon: "/icon.svg",
          badge: "/icon.svg",
        });
      } else {
        new Notification(title, { body, tag, data: { url }, icon: "/icon.svg" });
      }
    } catch (err) {
      console.warn("[Waqt] Notification failed:", err);
    }
  }, []);

  const schedulePrayerNotifications = useCallback(async (date: string) => {
    try {
      let res = await fetch(`/api/prayer-times?date=${date}`);
      if (!res.ok) {
        // Prayer times not cached — trigger a sync, then retry
        try {
          await fetch("/api/prayer-times/sync", { method: "POST" });
          // Wait a moment for the sync to complete
          await new Promise((r) => setTimeout(r, 2000));
          res = await fetch(`/api/prayer-times?date=${date}`);
        } catch {
          return;
        }
      }
      if (!res.ok) return;

      const times: PrayerTimes = await res.json();
      if (!times || !times.fajr) return;

      const now = new Date();

      for (const prayer of PRAYER_NOTIFICATIONS) {
        const rawTime = times[prayer.key];
        if (!rawTime) continue;

        // Asr display time = API time + 1 hour (match the display)
        let timeStr = rawTime;
        if (prayer.key === "asr") {
          const [h, m] = rawTime.split(":").map(Number);
          timeStr = `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }

        const prayerDate = new Date(`${date}T${timeStr}:00`);
        const diffMs = prayerDate.getTime() - now.getTime();

        // Only schedule if it's in the future (within next 24 hours)
        if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) continue;

        const timer = setTimeout(() => {
          showNotification(
            `${prayer.label} prayer time`,
            `It's time to pray ${prayer.label}.`,
            `prayer-${prayer.key}-${date}`,
            "/calendar/day",
          );
        }, diffMs);

        timersRef.current.push(timer);
      }
    } catch (err) {
      console.warn("[Waqt] Prayer notification scheduling failed:", err);
    }
  }, [showNotification]);

  const scheduleReminderNotifications = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/events?date=${date}`);
      if (!res.ok) return;
      const events: CalendarEvent[] = await res.json();
      if (!events || !Array.isArray(events)) return;

      const now = new Date();

      for (const event of events) {
        const eventStart = new Date(event.startAt);
        const notifyTime = new Date(eventStart.getTime() - 15 * 60 * 1000);
        const diffMs = notifyTime.getTime() - now.getTime();

        if (diffMs <= 1000 || diffMs > 24 * 60 * 60 * 1000) continue;

        // If the event is less than 15 min away, notify immediately
        const eventDiffMs = eventStart.getTime() - now.getTime();
        if (eventDiffMs > 0 && eventDiffMs < 15 * 60 * 1000) {
          const typeLabel = event.type === "reminder" ? "Reminder" : event.type === "task" ? "Task" : "Event";
          showNotification(
            `${typeLabel}: ${event.title}`,
            `Starting in ${Math.round(eventDiffMs / 60000)} min`,
            `event-${event.id}`,
            "/calendar/day",
          );
          continue;
        }

        const timer = setTimeout(() => {
          const typeLabel = event.type === "reminder" ? "Reminder" : event.type === "task" ? "Task" : "Event";
          showNotification(
            `${typeLabel}: ${event.title}`,
            `Starting in 15 min`,
            `event-${event.id}`,
            "/calendar/day",
          );
        }, diffMs);

        timersRef.current.push(timer);
      }
    } catch (err) {
      console.warn("[Waqt] Reminder notification scheduling failed:", err);
    }
  }, [showNotification]);

  const scheduleAll = useCallback(async () => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = new Date().toLocaleDateString("en-CA");
    try {
      await Promise.all([
        schedulePrayerNotifications(today),
        scheduleReminderNotifications(today),
      ]);
    } catch {
      // will retry on next interval
    }
  }, [schedulePrayerNotifications, scheduleReminderNotifications]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    // Only schedule if permission is already granted
    // Permission is requested from the Settings page (user gesture required)
    if (Notification.permission !== "granted") return;

    scheduleAll();

    // Re-schedule when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearAllTimers();
        scheduleAll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Re-schedule every 30 minutes
    const interval = setInterval(() => {
      clearAllTimers();
      scheduleAll();
    }, 30 * 60 * 1000);

    return () => {
      clearAllTimers();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [scheduleAll, clearAllTimers]);

  // Listen for permission changes — when user enables notifications in Settings,
  // immediately schedule
  useEffect(() => {
    const handlePermissionGranted = () => {
      clearAllTimers();
      scheduleAll();
    };
    window.addEventListener("waqt:notifications-enabled", handlePermissionGranted);
    return () => window.removeEventListener("waqt:notifications-enabled", handlePermissionGranted);
  }, [scheduleAll, clearAllTimers]);

  return null;
}
