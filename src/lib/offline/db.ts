import Dexie, { type Table } from "dexie";

export interface CachedEvent {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  type: string;
  color: string | null;
  recurrenceRule?: string | null;
  seriesId?: string | null;
  notifiedAt?: string | null;
  _dateKey: string; // YYYY-MM-DD for quick lookup by day
  _cachedAt: number; // timestamp when cached
}

export interface CachedPrayerLog {
  id: string;
  userId: string;
  date: string;
  prayerName: string;
  status: string;
  wentToMasjid: boolean | null;
  lastCheckinAt: string | null;
  _cachedAt: number;
}

export interface CachedPrayerTimes {
  date: string; // YYYY-MM-DD
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  madhab?: string | null;
  locationSet?: boolean;
  _cachedAt: number;
}

export interface CachedAnalytics {
  id: string; // always "current" — single record
  data: unknown;
  _cachedAt: number;
}

export interface CachedFriends {
  id: string; // always "current" — single record
  data: unknown;
  _cachedAt: number;
}

export interface CachedQadaa {
  id: string; // always "current" — single record
  data: unknown;
  _cachedAt: number;
}

export interface CachedSunnahLog {
  id: string; // composite: date_sunnahKey
  date: string;
  sunnahKey: string;
  prayed: boolean;
  _cachedAt: number;
}

export interface CachedGoal {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  description: string | null;
  status: string;
  sortOrder: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  _cachedAt: number;
}

export interface CachedHomework {
  id: string;
  title: string;
  description: string | null;
  classId: string | null;
  dueDate: string; // YYYY-MM-DD — indexed for fast date-range lookups
  dueTime: string | null;
  priority: string;
  status: string;
  kind: string;
  completedAt: string | null;
  _pending?: boolean;
  _cachedAt: number;
}

export interface CachedClass {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  sortOrder: number;
  _cachedAt: number;
}

export interface CachedHabit {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  color: string;
  targetCount: number;
  archived: boolean;
  sortOrder: number;
  _cachedAt: number;
}

export interface CachedHabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  count: number;
  _cachedAt: number;
}

export interface CachedNote {
  id: string;
  title: string | null;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  _cachedAt: number;
}

class WaqtOfflineDB extends Dexie {
  events!: Table<CachedEvent, string>;
  prayerLogs!: Table<CachedPrayerLog, string>;
  prayerTimes!: Table<CachedPrayerTimes, string>;
  analytics!: Table<CachedAnalytics, string>;
  friends!: Table<CachedFriends, string>;
  qadaa!: Table<CachedQadaa, string>;
  sunnahLogs!: Table<CachedSunnahLog, string>;
  goals!: Table<CachedGoal, string>;
  homework!: Table<CachedHomework, string>;
  classes!: Table<CachedClass, string>;
  habits!: Table<CachedHabit, string>;
  habitLogs!: Table<CachedHabitLog, string>;
  notes!: Table<CachedNote, string>;

  constructor() {
    super("waqt-offline-data");
    this.version(1).stores({
      // Index _dateKey for fast day lookups, id is primary key
      events: "id, _dateKey, userId",
      // Index date for fast day lookups
      prayerLogs: "id, date, userId, prayerName",
      // Index date for fast day lookups
      prayerTimes: "date",
      // Single-record stores — always "current"
      analytics: "id",
      friends: "id",
      qadaa: "id",
      // Index date for fast day lookups
      sunnahLogs: "id, date",
      // Index parentId for tree building
      goals: "id, parentId, userId",
    });
    // v2: add homework + classes stores for offline homework tracking
    this.version(2).stores({
      events: "id, _dateKey, userId",
      prayerLogs: "id, date, userId, prayerName",
      prayerTimes: "date",
      analytics: "id",
      friends: "id",
      qadaa: "id",
      sunnahLogs: "id, date",
      goals: "id, parentId, userId",
      // Index dueDate for fast date-range lookups, status for filtering pending/completed
      homework: "id, dueDate, status, classId",
      classes: "id, sortOrder",
    });
    // v3: add habits, habitLogs, notes stores for the unified Goals page
    this.version(3).stores({
      events: "id, _dateKey, userId",
      prayerLogs: "id, date, userId, prayerName",
      prayerTimes: "date",
      analytics: "id",
      friends: "id",
      qadaa: "id",
      sunnahLogs: "id, date",
      goals: "id, parentId, userId",
      homework: "id, dueDate, status, classId",
      classes: "id, sortOrder",
      // Index date for habit log lookups, habitId for filtering
      habits: "id, sortOrder, archived",
      habitLogs: "id, habitId, date, [habitId+date]",
      notes: "id, updatedAt, pinned",
    });
  }
}

// Singleton — reuse across all hooks
let dbInstance: WaqtOfflineDB | null = null;

export function getOfflineDB(): WaqtOfflineDB {
  if (typeof window === "undefined") {
    throw new Error("OfflineDB can only be used in the browser");
  }
  if (!dbInstance) {
    dbInstance = new WaqtOfflineDB();
  }
  return dbInstance;
}

// ─── Helper: clear all cached data (e.g. on logout) ───
export async function clearOfflineCache(): Promise<void> {
  try {
    const db = getOfflineDB();
    await Promise.all([
      db.events.clear(),
      db.prayerLogs.clear(),
      db.prayerTimes.clear(),
      db.analytics.clear(),
      db.friends.clear(),
      db.qadaa.clear(),
      db.sunnahLogs.clear(),
      db.goals.clear(),
      db.homework.clear(),
      db.classes.clear(),
      db.habits.clear(),
      db.habitLogs.clear(),
      db.notes.clear(),
    ]);
  } catch {
    // non-critical
  }
}

// ─── Prune old completed homework to prevent unbounded growth ───
// Completed homework older than 30 days is deleted from the cache.
export async function pruneOldHomeworkCache(): Promise<void> {
  try {
    const db = getOfflineDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString();
    // Delete completed homework older than 30 days
    await db.homework
      .where("status")
      .equals("completed")
      .and((hw) => hw.completedAt != null && hw.completedAt < cutoffStr)
      .delete();
  } catch {
    // non-critical
  }
}
