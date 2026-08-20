/**
 * Prayer Check-In State Machine
 * See AGENTS.md and PLAN.md Phase 4.
 *
 * Stages:
 *   0 = none (window not open or already resolved)
 *   1 = early (window just opened)
 *   2 = mid (50% elapsed)
 *   3 = closing (20 min before window ends)
 *
 * At window close: set assumed_prayed silently, no ledger charge.
 * "I will pray right now" → send urgent notification, stop further check-ins.
 */

export const STAGES = {
  NONE: 0,
  EARLY: 1,
  MID: 2,
  CLOSING: 3,
} as const;

export const CLOSING_THRESHOLD_MINUTES = 20;

export interface PrayerWindow {
  prayerName: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM" (start of next prayer, or end of day for Isha)
}

/**
 * Calculate which check-in stage is due for a prayer,
 * given the current time and the prayer's window.
 *
 * Returns the stage that should be fired NOW, or NONE if none is due.
 */
export function getCheckinStage(
  window: PrayerWindow,
  now: Date,
  currentStage: number,
): number {
  const { startTime, endTime } = window;

  // Parse prayer times as today's timestamps
  const start = parseTimeToday(startTime, now);
  const end = parseTimeToday(endTime, now);

  if (now < start || now >= end) {
    return STAGES.NONE;
  }

  // Window is open — calculate elapsed percentage
  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = now.getTime() - start.getTime();
  const elapsedPct = elapsedMs / totalMs;

  // Closing: within last 20 minutes
  const closingThreshold = new Date(end.getTime() - CLOSING_THRESHOLD_MINUTES * 60 * 1000);
  if (now >= closingThreshold) {
    return currentStage < STAGES.CLOSING ? STAGES.CLOSING : STAGES.NONE;
  }

  // Mid: 50% elapsed
  if (elapsedPct >= 0.5) {
    return currentStage < STAGES.MID ? STAGES.MID : STAGES.NONE;
  }

  // Early: window just opened
  return currentStage < STAGES.EARLY ? STAGES.EARLY : STAGES.NONE;
}

/**
 * Check if a prayer window has closed.
 * If so, the prayer should be marked as assumed_prayed.
 */
export function isWindowClosed(window: PrayerWindow, now: Date): boolean {
  const end = parseTimeToday(window.endTime, now);
  return now >= end;
}

/**
 * Parse "HH:MM" into a Date for today.
 */
function parseTimeToday(timeStr: string, base: Date): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Get the end time for a prayer (start of next prayer).
 * Isha ends at the end of the day (23:59).
 */
export function getPrayerWindow(
  prayerName: PrayerWindow["prayerName"],
  timings: { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string },
): PrayerWindow {
  const endTimes: Record<PrayerWindow["prayerName"], string> = {
    fajr: timings.sunrise,
    dhuhr: timings.asr,
    asr: timings.maghrib,
    maghrib: timings.isha,
    isha: "23:59",
  };

  return {
    prayerName,
    startTime: timings[prayerName],
    endTime: endTimes[prayerName],
  };
}
