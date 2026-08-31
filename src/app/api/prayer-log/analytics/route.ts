import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { calculateStreak } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// GET /api/prayer-log/analytics — get prayer analytics for the current user
//
// ─── Optimization ───
// Previously this route made 3 separate queries (90-day logs, all logs, prayer times).
// Now it makes 2 queries: one for all logs (selecting only needed columns) and
// one for prayer times. The 90-day filter is applied in-memory since we need
// all logs for streak calculation anyway. Selecting only needed columns reduces
// data transfer from the DB.
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's prayer settings for timezone + madhab
  const [settings] = await db
    .select({ timezone: schema.prayerSettings.timezone, madhab: schema.prayerSettings.madhab })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  const timezone = settings?.timezone || "America/Chicago";

  // 90-day lookback window — push the filter into the DB so we don't transfer
  // the user's entire lifetime of prayer logs. The 90-day window is sufficient
  // for both streak calculation (recent streak) and per-prayer analytics.
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  // Single query for prayer logs in the 90-day window — select only needed columns.
  const allLogs = await db
    .select({
      id: schema.prayerLog.id,
      date: schema.prayerLog.date,
      prayerName: schema.prayerLog.prayerName,
      status: schema.prayerLog.status,
      wentToMasjid: schema.prayerLog.wentToMasjid,
      markedAt: schema.prayerLog.markedAt,
    })
    .from(schema.prayerLog)
    .where(
      and(
        eq(schema.prayerLog.userId, session.userId),
        gte(schema.prayerLog.date, fromDate),
      ),
    );

  // The 90-day subset IS the full set now.
  const logs = allLogs;

  // Fetch cached prayer times for the last 90 days so we can validate
  // that markedAt falls within the prayer window. Without this, a user
  // who logs Fajr at 10 PM (because they forgot) would skew the average.
  const prayerTimesRows = await db
    .select()
    .from(schema.prayerTimesCache)
    .where(
      and(
        eq(schema.prayerTimesCache.userId, session.userId),
        gte(schema.prayerTimesCache.date, fromDate),
      ),
    );

  // Build a map: date -> { fajr, sunrise, dhuhr, asr, maghrib, isha } in minutes-from-midnight (UTC)
  const prayerTimesByDate = new Map<string, Record<string, number>>();
  for (const row of prayerTimesRows) {
    const dateStr = typeof row.date === "string" ? row.date : String(row.date);
    const parseTime = (t: string | Date): number => {
      const s = typeof t === "string" ? t : t.toISOString();
      // time column returns "HH:MM:SS" — extract hours and minutes
      const match = s.match(/(\d+):(\d+)/);
      return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : -1;
    };
    prayerTimesByDate.set(dateStr, {
      fajr: parseTime(row.fajr),
      sunrise: parseTime(row.sunrise),
      dhuhr: parseTime(row.dhuhr),
      asr: parseTime(row.asr),
      maghrib: parseTime(row.maghrib),
      isha: parseTime(row.isha),
    });
  }

  // Build prayer logs by date map for streak
  const logsByDate = new Map<string, Array<{ status: string }>>();
  for (const log of allLogs) {
    const dateStr = typeof log.date === "string" ? log.date : String(log.date);
    if (!logsByDate.has(dateStr)) logsByDate.set(dateStr, []);
    logsByDate.get(dateStr)!.push({ status: log.status });
  }

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
  const streak = calculateStreak(logsByDate, todayStr);

  // Last 7 days and last 30 days prayed counts
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  let thisWeekPrayed = 0;
  let thisMonthPrayed = 0;
  let lastPrayedDate: string | null = null;
  for (const log of allLogs) {
    if (log.status === "prayed" || log.status === "assumed_prayed") {
      const dateStr = typeof log.date === "string" ? log.date : String(log.date);
      if (dateStr >= weekAgoStr) thisWeekPrayed++;
      if (dateStr >= monthAgoStr) thisMonthPrayed++;
      if (!lastPrayedDate || dateStr > lastPrayedDate) lastPrayedDate = dateStr;
    }
  }

  // Compute the number of days the user has been active (from first log to today, capped at 90)
  // This is the correct denominator for consistency percentage
  let activeDays = 90;
  if (allLogs.length > 0) {
    const sortedDates = allLogs
      .map((l) => (typeof l.date === "string" ? l.date : String(l.date)))
      .sort();
    const firstDateStr = sortedDates[0];
    const firstDate = new Date(firstDateStr + "T00:00:00");
    const todayDate = new Date(todayStr + "T00:00:00");
    const diffMs = todayDate.getTime() - firstDate.getTime();
    activeDays = Math.min(90, Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)) + 1));
  }

  // Per-prayer analytics
  const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const perPrayer = prayers.map((prayer) => {
    const prayerLogs = logs.filter((l) => l.prayerName === prayer);
    const prayedLogs = prayerLogs.filter((l) => l.status === "prayed" || l.status === "assumed_prayed");
    const totalDays = prayedLogs.length;
    const masjidCount = prayedLogs.filter((l) => l.wentToMasjid === true).length;

    // Calculate average prayer time from markedAt — but ONLY include
    // check-ins where markedAt falls within the prayer's valid window.
    // This prevents late check-ins (e.g., logging Fajr at 10 PM) from
    // skewing the average.
    const markedTimes: number[] = [];
    for (const log of prayedLogs) {
      if (!log.markedAt) continue;
      const marked = new Date(log.markedAt);
      const localStr = marked.toLocaleString("en-US", { timeZone: timezone, hour12: false });
      const match = localStr.match(/(\d+):(\d+)/);
      if (!match) continue;
      const markedMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);

      // Look up prayer times for this log's date
      const dateStr = typeof log.date === "string" ? log.date : String(log.date);
      const times = prayerTimesByDate.get(dateStr);
      if (!times) continue; // No cached prayer times for this date — skip

      const prayerStart = times[prayer];
      if (prayerStart < 0) continue;

      // Define the prayer window end:
      // - Fajr: ends at sunrise
      // - Dhuhr: ends at Asr
      // - Asr: ends at Maghrib
      // - Maghrib: ends at Isha
      // - Isha: ends at midnight (1200 minutes = 20:00 UTC-ish, but use 24*60)
      let windowEnd: number;
      switch (prayer) {
        case "fajr":
          windowEnd = times.sunrise >= 0 ? times.sunrise : prayerStart + 120;
          break;
        case "dhuhr":
          windowEnd = times.asr >= 0 ? times.asr : prayerStart + 300;
          break;
        case "asr":
          windowEnd = times.maghrib >= 0 ? times.maghrib : prayerStart + 240;
          break;
        case "maghrib":
          windowEnd = times.isha >= 0 ? times.isha : prayerStart + 90;
          break;
        case "isha":
          // Isha can be prayed until Fajr of the next day, but for averaging
          // purposes, cap at midnight to avoid including extreme late-night
          // check-ins. Also allow a small grace period (30 min) before the
          // prayer start for those who pray slightly early.
          windowEnd = 24 * 60; // midnight
          break;
        default:
          windowEnd = prayerStart + 120;
      }

      // Allow a 15-minute grace period before the prayer start (some users
      // pray slightly early, especially for Dhuhr on Fridays)
      const windowStart = prayerStart - 15;

      // Handle wrap-around: if windowEnd < windowStart (e.g., Isha spans midnight),
      // check if markedMinutes >= windowStart OR markedMinutes <= windowEnd
      const inWindow =
        windowEnd < windowStart
          ? markedMinutes >= windowStart || markedMinutes <= windowEnd
          : markedMinutes >= windowStart && markedMinutes <= windowEnd;

      if (inWindow) {
        markedTimes.push(markedMinutes);
      }
      // If not in window, skip — don't include in average
    }

    const avgTime = markedTimes.length > 0
      ? Math.round(markedTimes.reduce((a, b) => a + b, 0) / markedTimes.length)
      : null;

    // Calculate % prayed in makruh time (simplified: prayed in last 10 min of window)
    // We'd need prayer times for each day to be precise, but we can estimate
    // For now, count prayers marked very late (within 10 min before next prayer)
    // This is a rough heuristic without per-day prayer times
    const makruhCount = 0; // TODO: calculate with prayer times per day
    const makruhPct = totalDays > 0 ? Math.round((makruhCount / totalDays) * 100) : 0;

    return {
      prayer,
      totalPrayed: totalDays,
      masjidCount,
      masjidPct: totalDays > 0 ? Math.round((masjidCount / totalDays) * 100) : 0,
      avgTimeMinutes: avgTime,
      avgTimeStr: avgTime !== null ? formatMinutesToTime(avgTime) : null,
      makruhPct,
      consistencyPct: activeDays > 0 ? Math.round((totalDays / activeDays) * 100) : 0,
    };
  });

  // Overall stats
  const totalPrayed = logs.filter((l) => l.status === "prayed" || l.status === "assumed_prayed").length;
  const totalMasjid = logs.filter((l) => l.wentToMasjid === true).length;

  // Days with all 5 prayers
  const completeDays = new Set<string>();
  const prayedByDate = new Map<string, Set<string>>();
  for (const log of allLogs) {
    if (log.status === "prayed" || log.status === "assumed_prayed") {
      const dateStr = typeof log.date === "string" ? log.date : String(log.date);
      if (!prayedByDate.has(dateStr)) prayedByDate.set(dateStr, new Set());
      prayedByDate.get(dateStr)!.add(log.prayerName);
      if (prayedByDate.get(dateStr)!.size === 5) {
        completeDays.add(dateStr);
      }
    }
  }

  return NextResponse.json({
    streak,
    totalCompleteDays: completeDays.size,
    totalPrayed,
    totalMasjid,
    masjidPct: totalPrayed > 0 ? Math.round((totalMasjid / totalPrayed) * 100) : 0,
    perPrayer,
    timezone,
    madhab: settings?.madhab || "standard",
    thisWeekPrayed,
    thisMonthPrayed,
    lastPrayedDate,
  });
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
}
