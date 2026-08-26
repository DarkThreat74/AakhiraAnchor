import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
// Window check helpers no longer needed server-side — users can log at any time

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

  // Note: No window check — users can log prayers at any time.
  // This is essential for offline use (when the outbox syncs, the window
  // may have passed) and for users who prayed but couldn't log at the time.
  // The cron job handles auto-resolution (assumed_prayed) for unmarked prayers.

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
