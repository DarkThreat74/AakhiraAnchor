/**
 * Local cache for prayer settings (timezone, calculation method, madhab).
 * Stored in localStorage so the app never needs a network round-trip
 * to know the user's timezone — critical for instant offline rendering.
 */

const SETTINGS_KEY = "waqt-prayer-settings";

export interface CachedPrayerSettings {
  timezone: string;
  calculationMethod: number;
  madhab: string | null;
  latitude: string;
  longitude: string;
}

export function getCachedPrayerSettings(): CachedPrayerSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPrayerSettings;
  } catch {
    return null;
  }
}

export function setCachedPrayerSettings(settings: CachedPrayerSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage might be full or disabled — non-critical
  }
}

export function clearCachedPrayerSettings(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // non-critical
  }
}
