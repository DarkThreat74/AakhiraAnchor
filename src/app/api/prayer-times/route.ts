import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/prayer-times?date=YYYY-MM-DD — get cached prayer times for a day
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 reads per minute per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("prayer-times-read", ip, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const [cached] = await db
    .select()
    .from(schema.prayerTimesCache)
    .where(
      and(
        eq(schema.prayerTimesCache.userId, session.userId),
        eq(schema.prayerTimesCache.date, dateStr),
      ),
    )
    .limit(1);

  if (!cached) {
    return NextResponse.json(
      { error: "No prayer times cached for this date. Sync first." },
      { status: 404 },
    );
  }

  return NextResponse.json(cached);
}
