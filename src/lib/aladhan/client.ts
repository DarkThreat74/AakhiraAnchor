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
 * @param school 0 = Shafi'i (standard), 1 = Hanafi — affects Asr calculation
 */
export async function fetchMonthPrayerTimes(
  latitude: number,
  longitude: number,
  month: number, // 1-12
  year: number,
  method = 2, // 2 = ISNA
  school: 0 | 1 = 0, // 0 = Shafi'i, 1 = Hanafi
): Promise<AlAdhanDayResponse["data"]> {
  const url = `${env.aladhanBaseUrl}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}`;

  // Retry with timeout — a single hanging AlAdhan call should not exhaust the
  // cron's 300s budget. Three attempts with 15s timeout each + backoff.
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`AlAdhan API error: ${res.status}`);
      }

      const json: AlAdhanDayResponse = await res.json();
      if (json.code !== 200) {
        throw new Error(`AlAdhan API returned code ${json.code}: ${json.status}`);
      }

      return json.data;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Exponential backoff: 1s, 2s
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastErr ?? new Error("AlAdhan fetch failed");
}

/**
 * Parse AlAdhan time string "05:23 (EST)" → "05:23"
 */
export function parseTime(timeStr: string): string {
  return timeStr.split(" ")[0].trim();
}
