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
 * @param timezone IANA timezone string (e.g. "America/Chicago") — passed to AlAdhan
 *   as the `timezonestring` query param so DST and timezone offsets are correct.
 *   If omitted, AlAdhan guesses from lat/lng (less reliable near timezone borders).
 */
export async function fetchMonthPrayerTimes(
  latitude: number,
  longitude: number,
  month: number, // 1-12
  year: number,
  method = 2, // 2 = ISNA
  school: 0 | 1 = 0, // 0 = Shafi'i, 1 = Hanafi
  timezone?: string,
): Promise<AlAdhanDayResponse["data"]> {
  const tzParam = timezone ? `&timezonestring=${encodeURIComponent(timezone)}` : "";
  const url = `${env.aladhanBaseUrl}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}${tzParam}`;

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
 * Parse AlAdhan time string "05:23 (EST)" → "05:23".
 * Also handles "05:23:00" (no timezone label) and "05:23:00 (EST)".
 * Always returns "HH:MM".
 */
export function parseTime(timeStr: string): string {
  const cleaned = timeStr.split(" ")[0].trim();
  // Strip seconds if present: "05:23:00" → "05:23"
  const parts = cleaned.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return cleaned;
}
