import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { fetchMonthPrayerTimes, parseTime } from "@/lib/aladhan/client";

export const dynamic = "force-dynamic";

// POST /api/prayer-times/sync — fetch and cache current month's prayer times
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 syncs per hour per IP (sync fetches a whole month from AlAdhan)
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("prayer-times-sync", ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many sync requests." }, { status: 429 });
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
      settings.madhab === "hanafi" ? 1 : 0,
    );

    // Batch upsert — single query instead of N+1 select+insert per day
    const values = days.map((day) => {
      const dateStr = day.date.gregorian.date; // "DD-MM-YYYY"
      const [dayNum, monthNum, yearNum] = dateStr.split("-").map(Number);
      const isoDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      const timings = day.timings;
      return {
        userId: session.userId,
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

    return NextResponse.json({ ok: true, daysCached: days.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch prayer times: ${message}` },
      { status: 502 },
    );
  }
}
