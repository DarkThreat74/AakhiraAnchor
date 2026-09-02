import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { fetchMonthPrayerTimes, parseTime } from "@/lib/aladhan/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/cron/prayer-times-sync — monthly, re-fetches prayer times for all users
// Processes users in batches to avoid timeout at 100k+ users.
// Only syncs users whose cached data is stale (not fetched this month).
const SYNC_BATCH_SIZE = 200; // smaller batch — each user makes an external API call

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"), request.headers.get("x-vercel-cron") === "1")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all prayer settings — we need per-user timezone to compute the
  // correct month/year for each user.
  const allSettings = await db
    .select({
      userId: schema.prayerSettings.userId,
      latitude: schema.prayerSettings.latitude,
      longitude: schema.prayerSettings.longitude,
      calculationMethod: schema.prayerSettings.calculationMethod,
      madhab: schema.prayerSettings.madhab,
      timezone: schema.prayerSettings.timezone,
    })
    .from(schema.prayerSettings);

  // Server UTC month for the stale-check query (conservative: fetches any user
  // who doesn't have data for the earliest possible current month globally)
  const nowUtc = new Date();
  const utcMonthStartStr = `${nowUtc.getFullYear()}-${String(nowUtc.getMonth() + 1).padStart(2, "0")}-01`;

  // Filter to users who are stale (no cache rows for their current month)
  const staleSettings = allSettings.filter((s) => {
    const tz = s.timezone || "UTC";
    const nowInTz = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    const [yearStr, monthStr] = nowInTz.split("-");
    const userMonthStart = `${yearStr}-${monthStr}-01`;
    // Stale if user's month start is >= UTC month start (covers the case where
    // the user is already in a new month while server UTC is behind)
    return userMonthStart >= utcMonthStartStr;
  });

  let successCount = 0;
  let failCount = 0;

  // Process in batches with limited concurrency
  for (let batchStart = 0; batchStart < staleSettings.length; batchStart += SYNC_BATCH_SIZE) {
    const batch = staleSettings.slice(batchStart, batchStart + SYNC_BATCH_SIZE);

    // Process batch with concurrency limit (5 parallel AlAdhan calls)
    const CONCURRENCY = 5;
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      const chunk = batch.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(async (settings) => {
          const tz = settings.timezone || "UTC";
          const nowInTz = new Date().toLocaleDateString("en-CA", { timeZone: tz });
          const [yearStr, monthStr] = nowInTz.split("-");
          const userMonth = parseInt(monthStr);
          const userYear = parseInt(yearStr);

          const latNum = parseFloat(settings.latitude);
          const lngNum = parseFloat(settings.longitude);
          if (isNaN(latNum) || isNaN(lngNum)) return; // skip invalid coordinates

          const days = await fetchMonthPrayerTimes(
            latNum,
            lngNum,
            userMonth,
            userYear,
            settings.calculationMethod,
            settings.madhab === "hanafi" ? 1 : 0,
            tz,
          );

          const values = days.map((day) => {
            const dateStr = day.date.gregorian.date;
            const [dayNum, monthNum, yearNum] = dateStr.split("-").map(Number);
            const isoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const timings = day.timings;
            return {
              userId: settings.userId,
              date: isoDate,
              fajr: parseTime(timings.Fajr),
              sunrise: parseTime(timings.Sunrise),
              dhuhr: parseTime(timings.Dhuhr),
              asr: parseTime(timings.Asr),
              maghrib: parseTime(timings.Maghrib),
              isha: parseTime(timings.Isha),
            };
          });

          await db
            .insert(schema.prayerTimesCache)
            .values(values)
            .onConflictDoUpdate({
              target: [schema.prayerTimesCache.userId, schema.prayerTimesCache.date],
              set: {
                fajr: sql.raw("excluded.fajr"),
                sunrise: sql.raw("excluded.sunrise"),
                dhuhr: sql.raw("excluded.dhuhr"),
                asr: sql.raw("excluded.asr"),
                maghrib: sql.raw("excluded.maghrib"),
                isha: sql.raw("excluded.isha"),
                fetchedAt: new Date(),
              },
            });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") successCount++;
        else failCount++;
      }
    }
  }

  return NextResponse.json({ ok: true, success: successCount, failed: failCount, skipped: staleSettings.length === 0 ? "all up to date" : undefined });
}
