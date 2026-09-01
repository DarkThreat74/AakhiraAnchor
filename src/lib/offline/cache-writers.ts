/**
 * Helpers to keep the IndexedDB offline cache in sync after mutations.
 * These are fire-and-forget — cache write failures are non-critical.
 */
import { getOfflineDB } from "./db";

interface EventLike {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  type: string;
  color?: string | null;
  recurrenceRule?: string | null;
  notify?: boolean;
  _pending?: boolean;
}

/**
 * Sync an array of events to the IndexedDB events store for a given date.
 * Replaces all events for that date key. Fire-and-forget.
 */
export function syncEventsToCache(date: string, events: EventLike[]): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.events.where("_dateKey").equals(date).delete().then(() =>
      db.events.bulkPut(
        events.map((e) => ({
          id: e.id,
          userId: "",
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt ?? null,
          type: e.type,
          color: e.color ?? null,
          recurrenceRule: e.recurrenceRule ?? null,
          _dateKey: date,
          _cachedAt: Date.now(),
        }))
      )
    ).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Add a single event to the IndexedDB cache. Fire-and-forget.
 */
export function addEventToCache(date: string, event: EventLike): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.events.put({
      id: event.id,
      userId: "",
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      type: event.type,
      color: event.color ?? null,
      recurrenceRule: event.recurrenceRule ?? null,
      _dateKey: date,
      _cachedAt: Date.now(),
    }).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Update a single event in the IndexedDB cache. Fire-and-forget.
 */
export function updateEventInCache(event: EventLike): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    // Derive _dateKey from startAt
    const d = new Date(event.startAt);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    db.events.put({
      id: event.id,
      userId: "",
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      type: event.type,
      color: event.color ?? null,
      recurrenceRule: event.recurrenceRule ?? null,
      _dateKey: dateKey,
      _cachedAt: Date.now(),
    }).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Delete a single event from the IndexedDB cache. Fire-and-forget.
 */
export function deleteEventFromCache(eventId: string): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.events.delete(eventId).catch(() => {});
  } catch {
    // non-critical
  }
}

interface PrayerLogLike {
  prayerName: string;
  status: string;
  wentToMasjid: boolean | null;
  id?: string;
}

/**
 * Sync prayer logs for a date to IndexedDB. Replaces all logs for that date.
 */
export function syncPrayerLogsToCache(date: string, logs: PrayerLogLike[]): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.prayerLogs.where("date").equals(date).delete().then(() =>
      db.prayerLogs.bulkPut(
        logs.map((l) => ({
          id: l.id || `${date}_${l.prayerName}`,
          userId: "",
          date,
          prayerName: l.prayerName,
          status: l.status,
          wentToMasjid: l.wentToMasjid,
          lastCheckinAt: null,
          _cachedAt: Date.now(),
        }))
      )
    ).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Upsert a single prayer log entry into the IndexedDB cache.
 */
export function upsertPrayerLogToCache(
  date: string,
  prayerName: string,
  status: string,
  wentToMasjid: boolean | null
): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.prayerLogs.put({
      id: `${date}_${prayerName}`,
      userId: "",
      date,
      prayerName,
      status,
      wentToMasjid,
      lastCheckinAt: new Date().toISOString(),
      _cachedAt: Date.now(),
    }).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Upsert a single sunnah log entry into the IndexedDB cache.
 */
export function upsertSunnahLogToCache(
  date: string,
  sunnahKey: string,
  prayed: boolean
): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.sunnahLogs.put({
      id: `${date}_${sunnahKey}`,
      date,
      sunnahKey,
      prayed,
      _cachedAt: Date.now(),
    }).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Cache a single-record blob (analytics, friends, qadaa).
 */
export function cacheBlob(store: "analytics" | "friends" | "qadaa", data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db[store].put({ id: "current", data, _cachedAt: Date.now() }).catch(() => {});
  } catch {
    // non-critical
  }
}

interface GoalLike {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: string;
  sortOrder: number;
  color: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  completedAt: string | Date | null;
}

/**
 * Sync the full goals list to IndexedDB. Replaces all goals.
 */
export function syncGoalsToCache(goals: GoalLike[]): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.goals.clear().then(() =>
      db.goals.bulkPut(
        goals.map((g) => ({
          id: g.id,
          userId: g.userId,
          parentId: g.parentId,
          title: g.title,
          description: g.description,
          status: g.status,
          sortOrder: g.sortOrder,
          color: g.color,
          createdAt: typeof g.createdAt === "string" ? g.createdAt : g.createdAt.toISOString(),
          updatedAt: typeof g.updatedAt === "string" ? g.updatedAt : g.updatedAt.toISOString(),
          completedAt: g.completedAt ? (typeof g.completedAt === "string" ? g.completedAt : g.completedAt.toISOString()) : null,
          _cachedAt: Date.now(),
        }))
      )
    ).catch(() => {});
  } catch {
    // non-critical
  }
}

/**
 * Delete a single goal from the IndexedDB cache.
 */
export function deleteGoalFromCache(goalId: string): void {
  if (typeof window === "undefined") return;
  try {
    const db = getOfflineDB();
    db.goals.delete(goalId).catch(() => {});
  } catch {
    // non-critical
  }
}
