import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { calculateStreak } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// GET /api/prayer-log/analytics — get prayer analytics for the current user
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all prayer logs for the user (last 90 days for analytics)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  const logs = await db
    .select()
    .from(schema.prayerLog)
    .where(
      and(
        eq(schema.prayerLog.userId, session.userId),
        gte(schema.prayerLog.date, fromDate),
      ),
    );

  // Get user's prayer settings for timezone
  const [settings] = await db
    .select({ timezone: schema.prayerSettings.timezone })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  const timezone = settings?.timezone || "America/Chicago";

  // Get all prayer logs for streak calculation (no date limit)
  const allLogs = await db
    .select()
    .from(schema.prayerLog)
    .where(eq(schema.prayerLog.userId, session.userId));

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

    // Calculate average prayer time from markedAt
    const markedTimes: number[] = [];
    for (const log of prayedLogs) {
      if (log.markedAt) {
        const marked = new Date(log.markedAt);
        const localStr = marked.toLocaleString("en-US", { timeZone: timezone, hour12: false });
        const match = localStr.match(/(\d+):(\d+)/);
        if (match) {
          markedTimes.push(parseInt(match[1]) * 60 + parseInt(match[2]));
        }
      }
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
