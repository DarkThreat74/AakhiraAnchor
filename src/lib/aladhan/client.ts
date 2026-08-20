import "server-only";
import { env } from "@/lib/env";

/**
 * AlAdhan API client.
 * See CODEBASE_PATTERNS.md and AGENTS.md for prayer-time caching rules.
 * Free API, no key required. Monthly fetch + cache in prayer_times_cache.
 */

export interface AlAdhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface AlAdhanDayResponse {
  code: number;
  status: string;
  data: {
    timings: Record<string, string>;
    date: {
      readable: string;
      timestamp: string;
      hijri: {
        date: string;
        day: string;
        month: { en: string; ar: string; number: number };
        year: string;
        weekdays: { en: string; ar: string };
      };
      gregorian: {
        date: string;
        weekday: { en: string };
      };
    };
  }[];
}

/**
 * Fetch a full month of prayer times from AlAdhan.
 * Returns array of daily timings.
 */
export async function fetchMonthPrayerTimes(
  latitude: number,
  longitude: number,
  month: number, // 1-12
  year: number,
  method = 2, // 2 = ISNA
): Promise<AlAdhanDayResponse["data"]> {
  const url = `${env.aladhanBaseUrl}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 }, // Cache for 24h at fetch level
  });

  if (!res.ok) {
    throw new Error(`AlAdhan API error: ${res.status}`);
  }

  const json: AlAdhanDayResponse = await res.json();
  if (json.code !== 200) {
    throw new Error(`AlAdhan API returned code ${json.code}: ${json.status}`);
  }

  return json.data;
}

/**
 * Parse AlAdhan time string "05:23 (EST)" → "05:23"
 */
export function parseTime(timeStr: string): string {
  return timeStr.split(" ")[0].trim();
}
