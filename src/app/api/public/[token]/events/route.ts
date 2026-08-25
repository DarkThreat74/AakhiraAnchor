import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/public/[token]/events?date=YYYY-MM-DD — list events for a specific day
// GET /api/public/[token]/events?from=YYYY-MM-DD&to=YYYY-MM-DD — list events in a date range
// Public, read-only, no auth required. Token is the user's publicShareToken.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  // Rate limit: 60 reads per minute per IP (public endpoint)
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("public-events-read", ip, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token } = await params;
  // Token is a 5-digit numeric code (or legacy 32-char hex)
  if (!token || !/^(\d{5}|[a-f0-9]{32})$/.test(token)) {
    return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  }

  // Look up the user by their public share token
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Calendar not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  // Range query (for month view)
  if (fromStr && toStr) {
    const fromDate = new Date(fromStr + "T00:00:00");
    const toDate = new Date(toStr + "T23:59:59.999");
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
    }

    const events = await db
      .select({
        id: schema.events.id,
        title: schema.events.title,
        startAt: schema.events.startAt,
        endAt: schema.events.endAt,
        type: schema.events.type,
        color: schema.events.color,
      })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.userId, user.id),
          gte(schema.events.startAt, fromDate),
          lte(schema.events.startAt, toDate),
        ),
      )
      .orderBy(schema.events.startAt);

    return NextResponse.json(events);
  }

  // Single day query — use wide window to handle timezone offsets
  if (!dateStr) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const startOfDayUtc = new Date(dateStr + "T00:00:00-12:00"); // earliest possible local midnight
  const endWithBuffer = new Date(dateStr + "T23:59:59.999-12:00"); // latest possible local end
  if (isNaN(startOfDayUtc.getTime()) || isNaN(endWithBuffer.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const events = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startAt: schema.events.startAt,
      endAt: schema.events.endAt,
      type: schema.events.type,
      color: schema.events.color,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, user.id),
        gte(schema.events.startAt, startOfDayUtc),
        lte(schema.events.startAt, endWithBuffer),
      ),
    )
    .orderBy(schema.events.startAt);

  return NextResponse.json(events);
}
