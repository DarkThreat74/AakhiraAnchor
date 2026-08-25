/**
 * Prayer check-in logic — smart masjid question windows.
 *
 * The "Did you pray in the masjid?" question only shows during specific windows
 * per prayer. Outside those windows, the question is hidden.
 *
 * Rules (from user spec):
 * - Dhuhr:  show masjid question from 12:00 PM to 3:00 PM
 * - Maghrib: show masjid question for 40 minutes after maghrib time
 * - Asr:    show masjid question as long as it's NOT in the last hour of Asr
 * - Isha:   show masjid question as long as it's NOT after 11:30 PM
 * - Fajr:   show masjid question as long as it's NOT in the last 30 minutes of Fajr
 */

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerTimings {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

/**
 * Parse "HH:MM" into minutes since midnight.
 */
export function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Get the current time in minutes since midnight for a given timezone.
 */
export function getCurrentMinutesInTimezone(timezone: string): number {
  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: timezone, hour12: false });
  const parts = localStr.match(/(\d+):(\d+):(\d+)/);
  if (!parts) return now.getHours() * 60 + now.getMinutes();
  return parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

/**
 * Get the end time (in minutes since midnight) for a prayer's window.
 * Asr is adjusted +1 hour (display time), so Dhuhr ends at adjusted Asr.
 *
 * Windows:
 * - Fajr → Sunrise
 * - Dhuhr → Asr (adjusted +1hr)
 * - Asr  → Maghrib
 * - Maghrib → Isha
 * - Isha → Fajr (next day) — can extend past midnight
 *
 * For Isha, the end time may be > 1440 (next day's Fajr in minutes from today's midnight).
 */
export function getPrayerWindowEnd(prayer: PrayerKey, timings: PrayerTimings): number {
  const asrAdjusted = parseMinutes(timings.asr) + 60;
  switch (prayer) {
    case "fajr":
      return parseMinutes(timings.sunrise);
    case "dhuhr":
      return asrAdjusted;
    case "asr":
      return parseMinutes(timings.maghrib);
    case "maghrib":
      return parseMinutes(timings.isha);
    case "isha":
      // Isha ends at next day's Fajr — add 1440 (24h) to represent next day
      return parseMinutes(timings.fajr) + 1440;
    default:
      return 0;
  }
}

/**
 * Get the start time (in minutes since midnight) for a prayer's window.
 * Asr is adjusted +1 hour.
 */
export function getPrayerWindowStart(prayer: PrayerKey, timings: PrayerTimings): number {
  if (prayer === "asr") {
    return parseMinutes(timings.asr) + 60;
  }
  return parseMinutes(timings[prayer]);
}

/**
 * Check if a prayer's window is currently open (can still be logged).
 * Returns true if the current time is within the prayer window.
 *
 * For Isha, the window extends to next day's Fajr, so we handle two cases:
 * - Before midnight: currentMinutes >= ishaStart
 * - After midnight: currentMinutes <= fajrStart (treated as still within Isha)
 */
export function isPrayerWindowOpen(
  prayer: PrayerKey,
  currentMinutes: number,
  timings: PrayerTimings,
): boolean {
  return getPrayerWindowState(prayer, currentMinutes, timings) === "open";
}

/**
 * Get the state of a prayer's window relative to the current time.
 * Returns "before" (not started yet), "open" (within window), or "ended" (window closed).
 */
export function getPrayerWindowState(
  prayer: PrayerKey,
  currentMinutes: number,
  timings: PrayerTimings,
): "before" | "open" | "ended" {
  const start = getPrayerWindowStart(prayer, timings);
  const end = getPrayerWindowEnd(prayer, timings);

  if (prayer === "isha") {
    // Isha window: from isha start today to fajr start tomorrow (crosses midnight)
    const ishaStart = parseMinutes(timings.isha);
    const fajrStart = parseMinutes(timings.fajr);
    if (currentMinutes >= ishaStart) {
      // After Isha start tonight — within window
      return "open";
    }
    // Before Isha start — could be afternoon (before) or after midnight (still in yesterday's Isha)
    if (currentMinutes < fajrStart) {
      // Before Fajr and before Isha start — must be after midnight, still in yesterday's Isha window
      return "open";
    }
    // After Fajr but before Isha start — afternoon/evening, Isha hasn't started yet
    return "before";
  }

  if (currentMinutes < start) return "before";
  if (currentMinutes > end) return "ended";
  return "open";
}

/**
 * Determine whether the "Did you pray in the masjid?" question should be shown
 * for the given prayer, based on the current time and prayer timings.
 *
 * All times are "HH:MM" in the user's local timezone.
 */
export function shouldShowMasjidQuestion(
  prayer: PrayerKey,
  currentMinutes: number,
  timings: PrayerTimings,
): boolean {
  switch (prayer) {
    case "fajr": {
      // Show as long as NOT in the last 30 minutes of Fajr (Fajr ends at sunrise)
      const fajrEnd = parseMinutes(timings.sunrise);
      const last30 = fajrEnd - 30;
      return currentMinutes < last30;
    }
    case "dhuhr": {
      // Show from 12:00 PM (720 min) to 3:00 PM (1080 min)
      return currentMinutes >= 720 && currentMinutes <= 1080;
    }
    case "asr": {
      // Show as long as NOT in the last hour of Asr (Asr ends at maghrib)
      const asrEnd = parseMinutes(timings.maghrib);
      const lastHour = asrEnd - 60;
      return currentMinutes < lastHour;
    }
    case "maghrib": {
      // Show for 40 minutes after maghrib time
      const maghribStart = parseMinutes(timings.maghrib);
      const windowEnd = maghribStart + 40;
      return currentMinutes >= maghribStart && currentMinutes <= windowEnd;
    }
    case "isha": {
      // Show as long as within the Isha window (after isha start tonight, or after midnight before fajr)
      const ishaStart = parseMinutes(timings.isha);
      const fajrStart = parseMinutes(timings.fajr);
      if (currentMinutes >= ishaStart) {
        // After Isha start tonight — within window
        return true;
      }
      // Before Isha start — only show if after midnight (before Fajr = still yesterday's Isha)
      return currentMinutes < fajrStart;
    }
    default:
      return false;
  }
}

/**
 * Calculate the Asr time to display — API time + 1 hour.
 * Returns "HH:MM" format.
 */
export function getDisplayAsrTime(apiAsrTime: string): string {
  const minutes = parseMinutes(apiAsrTime);
  const adjusted = minutes + 60;
  const h = Math.floor(adjusted / 60) % 24;
  const m = adjusted % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Check if a prayer time falls in the "Makruh" (disliked) window.
 * Makruh times for prayer:
 * - Sunrise to ~15 min after (about when the sun is rising)
 * - Noon (when sun is at zenith, ~5 min before dhuhr to dhuhr)
 * - Sunset (maghrib time to ~5 min after, when sun is setting)
 *
 * For our purposes, we'll consider a prayer as prayed in Makruh time if:
 * - The prayer was marked during the last 10 minutes before the next prayer
 *   (i.e., prayed right at the closing of the window)
 *
 * Actually, the standard Makruh times are:
 * 1. When the sun is rising (sunrise to ~15 min after)
 * 2. When the sun is at its zenith (noon, ~5 min before dhuhr)
 * 3. When the sun is setting (maghrib time, ~5 min after)
 *
 * But since we're tracking when the user MARKED the prayer (not when they actually prayed),
 * we'll use a simpler heuristic: if the prayer was marked within the last 20 minutes
 * of the prayer window, it's considered "close to Makruh" / prayed late.
 */
export function isPrayedInMakruhTime(
  prayer: PrayerKey,
  markedMinutes: number,
  timings: PrayerTimings,
): boolean {
  switch (prayer) {
    case "fajr": {
      // Makruh: prayed at or after sunrise (too late)
      const sunrise = parseMinutes(timings.sunrise);
      return markedMinutes >= sunrise;
    }
    case "dhuhr": {
      // Makruh: prayed in the last 10 min before Asr
      const asr = parseMinutes(timings.asr);
      return markedMinutes >= asr - 10;
    }
    case "asr": {
      // Makruh: prayed in the last portion before maghrib (sunset)
      const maghrib = parseMinutes(timings.maghrib);
      return markedMinutes >= maghrib - 10;
    }
    case "maghrib": {
      // Makruh: prayed more than a few minutes after maghrib (during sunset)
      const maghrib = parseMinutes(timings.maghrib);
      return markedMinutes >= maghrib + 5 && markedMinutes <= maghrib + 15;
    }
    case "isha": {
      // Not typically Makruh — Isha can be prayed until fajr
      return false;
    }
    default:
      return false;
  }
}

/**
 * Calculate the current streak (consecutive days where all 5 prayers were prayed/assumed_prayed).
 *
 * @param prayerLogsByDate - Map of "YYYY-MM-DD" -> array of prayer logs for that day
 * @param todayStr - Today's date string "YYYY-MM-DD"
 * @returns The streak count (0 if today not complete, counts back from yesterday)
 */
export function calculateStreak(
  prayerLogsByDate: Map<string, Array<{ status: string }>>,
  todayStr: string,
): number {
  let streak = 0;

  // Start from today and go backwards
  const today = new Date(todayStr + "T00:00:00");

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

    const logs = prayerLogsByDate.get(dateStr) || [];
    const prayedCount = logs.filter(
      (l) => l.status === "prayed" || l.status === "assumed_prayed",
    ).length;

    if (prayedCount === 5) {
      streak++;
    } else if (prayedCount > 0 && prayedCount < 5) {
      // Partial day — streak breaks
      break;
    } else if (i > 0) {
      // No logs for a past day — streak breaks
      break;
    }
    // If i === 0 and no logs, skip today (streak can still continue from yesterday)
  }

  return streak;
}
