import { NextRequest, NextResponse } from "next/server";
import { sql, eq, gte, and, isNull } from "drizzle-orm";
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

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStartStr = `${year}-${String(month).padStart(2, "0")}-01`;

  // Only sync users whose prayer times haven't been fetched this month.
  // This avoids re-fetching for users who already have current data.
  const staleSettings = await db
    .select({
      userId: schema.prayerSettings.userId,
      latitude: schema.prayerSettings.latitude,
      longitude: schema.prayerSettings.longitude,
      calculationMethod: schema.prayerSettings.calculationMethod,
      madhab: schema.prayerSettings.madhab,
    })
    .from(schema.prayerSettings)
    .leftJoin(
      schema.prayerTimesCache,
      and(
        eq(schema.prayerTimesCache.userId, schema.prayerSettings.userId),
        gte(schema.prayerTimesCache.date, monthStartStr),
      ),
    )
    .where(isNull(schema.prayerTimesCache.userId));

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
          const days = await fetchMonthPrayerTimes(
            parseFloat(settings.latitude),
            parseFloat(settings.longitude),
            month,
            year,
            settings.calculationMethod,
            settings.madhab === "hanafi" ? 1 : 0,
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
