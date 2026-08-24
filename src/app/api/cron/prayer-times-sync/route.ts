import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { fetchMonthPrayerTimes, parseTime } from "@/lib/aladhan/client";

export const dynamic = "force-dynamic";

// POST /api/cron/prayer-times-sync — monthly, re-fetches prayer times for all users
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"), request.headers.get("x-vercel-cron") === "1")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allSettings = await db.select().from(schema.prayerSettings);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let successCount = 0;
  let failCount = 0;

  for (const settings of allSettings) {
    try {
      const days = await fetchMonthPrayerTimes(
        parseFloat(settings.latitude),
        parseFloat(settings.longitude),
        month,
        year,
        settings.calculationMethod,
      );

      // Batch upsert — single query per user instead of N+1
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

      successCount++;
    } catch {
      failCount++;
    }
  }

  return NextResponse.json({ ok: true, success: successCount, failed: failCount });
}
