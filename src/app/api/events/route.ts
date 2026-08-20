import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/events?date=YYYY-MM-DD — list events for a specific day
// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD — list events in a date range
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 60 reads per minute per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-read", ip, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.userId, session.userId),
          gte(schema.events.startAt, fromDate),
          lte(schema.events.startAt, toDate),
        ),
      )
      .orderBy(schema.events.startAt);

    return NextResponse.json(events);
  }

  // Single day query
  if (!dateStr) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const date = new Date(dateStr + "T00:00:00");
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, session.userId),
        gte(schema.events.startAt, startOfDay),
        lte(schema.events.startAt, endOfDay),
      ),
    )
    .orderBy(schema.events.startAt);

  return NextResponse.json(events);
}

// POST /api/events — create a new event
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 event creates per hour per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-create", ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { title, startAt, endAt, type, recurrenceRule } = body as {
    title?: string;
    startAt?: string;
    endAt?: string;
    type?: string;
    recurrenceRule?: string;
  };

  // Validate required fields
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "Title must be 200 characters or less." }, { status: 400 });
  }
  if (!startAt) {
    return NextResponse.json({ error: "Start time is required." }, { status: 400 });
  }
  if (!endAt) {
    return NextResponse.json({ error: "End time is required." }, { status: 400 });
  }

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
  }

  if (endDate <= startDate) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  // Validate type
  const validTypes = ["block", "task", "reminder"];
  const eventType = validTypes.includes(type || "") ? (type as "block" | "task" | "reminder") : "block";

  const [event] = await db
    .insert(schema.events)
    .values({
      userId: session.userId,
      title: title.trim(),
      startAt: startDate,
      endAt: endDate,
      type: eventType,
      recurrenceRule: recurrenceRule?.trim() || null,
      createdVia: "manual",
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
