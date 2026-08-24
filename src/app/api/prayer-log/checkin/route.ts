import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { getPrayerWindowState, getCurrentMinutesInTimezone, getPrayerWindowStart, type PrayerTimings, type PrayerKey } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// POST /api/prayer-log/checkin — record a prayer check-in
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("prayer-checkin", ip, 30, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { date, prayerName, status, wentToMasjid } = body as {
    date?: string;
    prayerName?: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
    status?: "prayed" | "missed" | "pending" | "assumed_prayed";
    wentToMasjid?: boolean;
  };

  if (!date || !prayerName) {
    return NextResponse.json({ error: "Date and prayer name are required." }, { status: 400 });
  }

  // Validate date format (YYYY-MM-DD)
  const dateCheck = new Date(date + "T00:00:00");
  if (isNaN(dateCheck.getTime())) {
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
  }

  const validPrayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  if (!validPrayers.includes(prayerName)) {
    return NextResponse.json({ error: "Invalid prayer name." }, { status: 400 });
  }

  const validStatuses = ["prayed", "missed", "pending", "assumed_prayed"];
  const finalStatus = validStatuses.includes(status || "") ? status : "prayed";

  // ── Window check: don't allow logging "prayed" after the prayer window has ended ──
  // "pending" (undo) is always allowed.
  if (finalStatus === "prayed") {
    // Get user's prayer settings (timezone)
    const [settings] = await db
      .select({ timezone: schema.prayerSettings.timezone })
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.userId, session.userId))
      .limit(1);

    if (settings?.timezone) {
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

        const state = getPrayerWindowState(prayerName as PrayerKey, currentMinutes, timings);
        if (state !== "open") {
          const prayerLabel = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);
          if (state === "before") {
            // Format the start time for the message
            const startMinutes = getPrayerWindowStart(prayerName as PrayerKey, timings);
            const startH = Math.floor(startMinutes / 60);
            const startM = startMinutes % 60;
            const period = startH >= 12 ? "PM" : "AM";
            const displayH = startH === 0 ? 12 : startH > 12 ? startH - 12 : startH;
            const timeStr = `${displayH}:${String(startM).padStart(2, "0")} ${period}`;
            return NextResponse.json(
              { error: `${prayerLabel} hasn't started yet. It begins at ${timeStr}.` },
              { status: 403 },
            );
          }
          return NextResponse.json(
            { error: `The ${prayerLabel} prayer window has ended. You can no longer log this prayer.` },
            { status: 403 },
          );
        }
      }
      // If no cached prayer times, fail open (allow the check-in)
    }
  }

  // Upsert prayer log entry
  const [existing] = await db
    .select()
    .from(schema.prayerLog)
    .where(
      and(
        eq(schema.prayerLog.userId, session.userId),
        eq(schema.prayerLog.date, date),
        eq(schema.prayerLog.prayerName, prayerName as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(schema.prayerLog)
      .set({
        status: finalStatus as "prayed" | "missed" | "pending" | "assumed_prayed",
        wentToMasjid: wentToMasjid ?? existing.wentToMasjid,
        markedAt: new Date(),
        lastCheckinAt: new Date(),
        // Reset checkin stage when user manually marks as prayed
        checkinStage: 0,
      })
      .where(eq(schema.prayerLog.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  }

  const [entry] = await db
    .insert(schema.prayerLog)
    .values({
      userId: session.userId,
      date,
      prayerName: prayerName as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha",
      status: finalStatus as "prayed" | "missed" | "pending" | "assumed_prayed",
      wentToMasjid: wentToMasjid ?? false,
      markedAt: new Date(),
      lastCheckinAt: new Date(),
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
