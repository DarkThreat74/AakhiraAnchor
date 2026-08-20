import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { fetchMonthPrayerTimes, parseTime } from "@/lib/aladhan/client";

export const dynamic = "force-dynamic";

// POST /api/prayer-times/sync — fetch and cache current month's prayer times
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's prayer settings (location)
  const [settings] = await db
    .select()
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  if (!settings) {
    return NextResponse.json(
      { error: "No location set. Complete onboarding first." },
      { status: 400 },
    );
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  try {
    const days = await fetchMonthPrayerTimes(
      parseFloat(settings.latitude),
      parseFloat(settings.longitude),
      month,
      year,
      settings.calculationMethod,
    );

    // Upsert each day into the cache
    for (const day of days) {
      const dateStr = day.date.gregorian.date; // "DD-MM-YYYY"
      const [dayNum, monthNum, yearNum] = dateStr.split("-").map(Number);
      const isoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

      const timings = day.timings;
      const values = {
        userId: session.userId,
        date: isoDate,
        fajr: parseTime(timings.Fajr),
        sunrise: parseTime(timings.Sunrise),
        dhuhr: parseTime(timings.Dhuhr),
        asr: parseTime(timings.Asr),
        maghrib: parseTime(timings.Maghrib),
        isha: parseTime(timings.Isha),
      };

      // Check if entry exists
      const [existing] = await db
        .select()
        .from(schema.prayerTimesCache)
        .where(
          eq(schema.prayerTimesCache.userId, session.userId) &&
          eq(schema.prayerTimesCache.date, isoDate),
        )
        .limit(1);

      if (existing) {
        await db
          .update(schema.prayerTimesCache)
          .set(values)
          .where(eq(schema.prayerTimesCache.id, existing.id));
      } else {
        await db.insert(schema.prayerTimesCache).values(values);
      }
    }

    return NextResponse.json({ ok: true, daysCached: days.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch prayer times: ${message}` },
      { status: 502 },
    );
  }
}
