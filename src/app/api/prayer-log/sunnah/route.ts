import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { getSunnahsForMadhab, type FardPrayer } from "@/lib/prayer/sunnahs";
import { getCurrentMinutesInTimezone, parseMinutes, type PrayerTimings } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// POST /api/prayer-log/sunnah — log or unlog a sunnah prayer
// Body: { date: "YYYY-MM-DD", sunnahKey: string, prayed: boolean }
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("sunnah-log", ip, 60, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { date, sunnahKey, prayed } = body as {
    date?: string;
    sunnahKey?: string;
    prayed?: boolean;
  };

  if (!date || !sunnahKey) {
    return NextResponse.json({ error: "Date and sunnah key are required." }, { status: 400 });
  }

  // Validate date format
  const dateCheck = new Date(date + "T00:00:00");
  if (isNaN(dateCheck.getTime())) {
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
  }

  // Get user's prayer settings (timezone + madhab)
  const [settings] = await db
    .select()
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  if (!settings) {
    return NextResponse.json({ error: "Prayer settings not configured." }, { status: 400 });
  }

  // Find the sunnah definition
  const sunnahs = getSunnahsForMadhab(settings.madhab);
  const sunnah = sunnahs.find((s) => s.key === sunnahKey);
  if (!sunnah) {
    return NextResponse.json({ error: "Invalid sunnah key." }, { status: 400 });
  }

  // If un-logging (prayed = false), allow it without checks
  if (prayed === false) {
    await db
      .delete(schema.sunnahLog)
      .where(
        and(
          eq(schema.sunnahLog.userId, session.userId),
          eq(schema.sunnahLog.date, date),
          eq(schema.sunnahLog.sunnahKey, sunnahKey),
        ),
      );
    return NextResponse.json({ ok: true, prayed: false });
  }

  // ── Algorithmic checks for logging (prayed = true) ──

  // 1. For "after" sunnahs: the associated fard must be logged as "prayed"
  // Also for Witr (standalone but requires Isha to be prayed first)
  // Nafls like Duha don't require any fard to be prayed first
  if (sunnah.position === "after" || (sunnah.position === "standalone" && sunnah.key === "witr")) {
    const [fardLog] = await db
      .select()
      .from(schema.prayerLog)
      .where(
        and(
          eq(schema.prayerLog.userId, session.userId),
          eq(schema.prayerLog.date, date),
          eq(schema.prayerLog.prayerName, sunnah.associatedFard as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"),
        ),
      )
      .limit(1);

    if (!fardLog || fardLog.status !== "prayed") {
      const fardLabel = sunnah.associatedFard.charAt(0).toUpperCase() + sunnah.associatedFard.slice(1);
      return NextResponse.json(
        { error: `You must log ${fardLabel} as prayed before logging this sunnah.` },
        { status: 403 },
      );
    }
  }

  // 2. Time-based checks: can't log this sunnah until the fard time has started,
  //    and can't log it once the next fard's time has started (lock)
  // Get cached prayer times for this date
  const [cache] = await db
    .select()
    .from(schema.prayerTimesCache)
    .where(
      and(
        eq(schema.prayerTimesCache.userId, session.userId),
        eq(schema.prayerTimesCache.date, date),
      ),
    )
    .limit(1);

  if (cache) {
    const timings: PrayerTimings = {
      fajr: cache.fajr,
      sunrise: cache.sunrise,
      dhuhr: cache.dhuhr,
      asr: cache.asr,
      maghrib: cache.maghrib,
      isha: cache.isha,
    };

    const currentMinutes = getCurrentMinutesInTimezone(settings.timezone);

    // Determine which prayer time has started
    const prayerMinutes: Record<FardPrayer, number> = {
      fajr: parseMinutes(timings.fajr),
      dhuhr: parseMinutes(timings.dhuhr),
      asr: parseMinutes(timings.asr),
      maghrib: parseMinutes(timings.maghrib),
      isha: parseMinutes(timings.isha),
    };

    // 2a. "before" sunnahs: the associated fard's time must have started
    //     (you can't pray "4 before Dhuhr" before Dhuhr time actually comes in)
    if (sunnah.position === "before") {
      const fardStartMinutes = prayerMinutes[sunnah.associatedFard];
      if (currentMinutes < fardStartMinutes) {
        const fardLabel = sunnah.associatedFard.charAt(0).toUpperCase() + sunnah.associatedFard.slice(1);
        return NextResponse.json(
          { error: `${fardLabel} hasn't started yet — you can't log this sunnah until ${fardLabel} time comes in.` },
          { status: 403 },
        );
      }
    }

    // 2b. "after" sunnahs: also require the fard time to have started
    //     (redundant with the fard-log check above, but catches the case where
    //     the fard was logged as assumed_prayed without the time actually starting)
    if (sunnah.position === "after") {
      const fardStartMinutes = prayerMinutes[sunnah.associatedFard];
      if (currentMinutes < fardStartMinutes) {
        const fardLabel = sunnah.associatedFard.charAt(0).toUpperCase() + sunnah.associatedFard.slice(1);
        return NextResponse.json(
          { error: `${fardLabel} hasn't started yet.` },
          { status: 403 },
        );
      }
    }

    // 2c. Check if the lock prayer has started (sunnah window has closed)
    if (sunnah.locksAt) {
      const lockMinutes = prayerMinutes[sunnah.locksAt];
      // Special case: Witr locks at Fajr — but Fajr is the FIRST prayer of the day
      // If current time is after midnight but before Fajr, we're still in "Isha's window"
      // so Witr should still be loggable
      if (sunnah.key === "witr" && sunnah.locksAt === "fajr") {
        // Witr is locked only when Fajr starts (currentMinutes >= Fajr AND currentMinutes < Isha)
        if (currentMinutes >= lockMinutes && currentMinutes < prayerMinutes.isha) {
          return NextResponse.json(
            { error: "Witr can no longer be logged — Fajr has started." },
            { status: 403 },
          );
        }
      } else {
        // Normal case: locked when the next prayer starts
        if (currentMinutes >= lockMinutes) {
          const lockLabel = sunnah.locksAt.charAt(0).toUpperCase() + sunnah.locksAt.slice(1);
          return NextResponse.json(
            { error: `This sunnah can no longer be logged — ${lockLabel} has started.` },
            { status: 403 },
          );
        }
      }
    }
  }

  // Upsert sunnah log
  const [existing] = await db
    .select()
    .from(schema.sunnahLog)
    .where(
      and(
        eq(schema.sunnahLog.userId, session.userId),
        eq(schema.sunnahLog.date, date),
        eq(schema.sunnahLog.sunnahKey, sunnahKey),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schema.sunnahLog)
      .set({ prayed: true, loggedAt: new Date() })
      .where(eq(schema.sunnahLog.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }

  const [entry] = await db
    .insert(schema.sunnahLog)
    .values({
      userId: session.userId,
      date,
      sunnahKey,
      associatedFard: sunnah.associatedFard as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha",
      prayed: true,
      loggedAt: new Date(),
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

// GET /api/prayer-log/sunnah?date=YYYY-MM-DD — get all sunnah logs for a date
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const logs = await db
    .select()
    .from(schema.sunnahLog)
    .where(
      and(
        eq(schema.sunnahLog.userId, session.userId),
        eq(schema.sunnahLog.date, date),
      ),
    );

  return NextResponse.json(logs);
}
