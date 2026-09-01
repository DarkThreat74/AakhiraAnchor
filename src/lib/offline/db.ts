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

class WaqtOfflineDB extends Dexie {
  events!: Table<CachedEvent, string>;
  prayerLogs!: Table<CachedPrayerLog, string>;
  prayerTimes!: Table<CachedPrayerTimes, string>;
  analytics!: Table<CachedAnalytics, string>;
  friends!: Table<CachedFriends, string>;
  qadaa!: Table<CachedQadaa, string>;
  sunnahLogs!: Table<CachedSunnahLog, string>;
  goals!: Table<CachedGoal, string>;

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
    ]);
  } catch {
    // non-critical
  }
}
