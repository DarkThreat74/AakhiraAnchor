import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/events?date=YYYY-MM-DD — list events for a specific day (in user's timezone)
// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD — list events in a date range
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-read", ip, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (fromStr && toStr) {
    // Use user's timezone for range boundaries
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

  if (!dateStr) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  // Compute day boundaries in UTC with a wide buffer to handle any timezone offset.
  // start: earliest possible local midnight (UTC-12) = 2026-08-21T00:00:00-12:00 = 2026-08-21T12:00:00Z
  // end: latest possible local end (UTC-12) = 2026-08-21T23:59:59.999-12:00 = 2026-08-22T11:59:59Z
  // The client filters by local time when rendering, so extra events are harmless.
  const startOfDayUtc = new Date(dateStr + "T00:00:00-12:00");
  const endWithBuffer = new Date(dateStr + "T23:59:59.999-12:00");
  if (isNaN(startOfDayUtc.getTime()) || isNaN(endWithBuffer.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const events = await db
    .select()
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, session.userId),
        gte(schema.events.startAt, startOfDayUtc),
        lte(schema.events.startAt, endWithBuffer),
      ),
    )
    .orderBy(schema.events.startAt);

  return NextResponse.json(events);
}

// POST /api/events — create a new event (or recurring series)
// Body: { title, startAt, endAt, type, recurrenceEndDate? }
// If recurrenceEndDate is set, creates weekly occurrences from startAt until that date.
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { title, startAt, endAt, type, recurrenceEndDate, recurrenceDays } = body as {
    title?: string;
    startAt?: string;
    endAt?: string;
    type?: string;
    recurrenceEndDate?: string;
    recurrenceDays?: number[];
  };

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

  // For reminders, end can equal start (they're instantaneous lines)
  // For blocks/tasks, end must be after start
  const validTypes = ["block", "task", "reminder"];
  const eventType = validTypes.includes(type || "") ? (type as "block" | "task" | "reminder") : "block";

  if (eventType !== "reminder" && endDate <= startDate) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  // For reminders, if end <= start, set end = start + 1 minute (minimal duration for DB)
  let effectiveEnd = endDate;
  if (eventType === "reminder" && endDate <= startDate) {
    effectiveEnd = new Date(startDate.getTime() + 60 * 1000);
  }

  // Check if this is a recurring event
  if (recurrenceEndDate) {
    const recurEnd = new Date(recurrenceEndDate + "T23:59:59");
    if (isNaN(recurEnd.getTime())) {
      return NextResponse.json({ error: "Invalid recurrence end date." }, { status: 400 });
    }
    if (recurEnd <= startDate) {
      return NextResponse.json({ error: "Recurrence end date must be after start date." }, { status: 400 });
    }

    // Determine which days of the week to repeat on
    // recurrenceDays: array of 0-6 (0=Sunday, 6=Saturday)
    // If not provided, default to the day of the start date
    const startDayOfWeek = startDate.getDay();
    const daysToRepeat = recurrenceDays && recurrenceDays.length > 0
      ? [...new Set(recurrenceDays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
      : [startDayOfWeek];

    if (daysToRepeat.length === 0) {
      return NextResponse.json({ error: "Select at least one day to repeat on." }, { status: 400 });
    }

    // Generate occurrences: iterate day by day from startDate until recurEnd
    // For each day, check if its day-of-week is in daysToRepeat
    const occurrences: Array<{ startAt: Date; endAt: Date }> = [];
    const durationMs = effectiveEnd.getTime() - startDate.getTime();
    const timeOfDayMs = (startDate.getHours() * 60 + startDate.getMinutes()) * 60 * 1000;

    // Start from the first day of the recurrence (the start date itself)
    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= recurEnd) {
      const dow = currentDate.getDay();
      if (daysToRepeat.includes(dow)) {
        // Create the event at the same time of day as the original
        const occStart = new Date(currentDate.getTime() + timeOfDayMs);
        // Don't create events before the original start date
        if (occStart >= startDate) {
          occurrences.push({
            startAt: occStart,
            endAt: new Date(occStart.getTime() + durationMs),
          });
        }
      }
      // Move to next day
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    if (occurrences.length === 0) {
      return NextResponse.json({ error: "No occurrences generated before the end date." }, { status: 400 });
    }

    // Cap at 365 occurrences to prevent abuse
    const capped = occurrences.slice(0, 365);

    // Insert all occurrences
    const inserted = await db
      .insert(schema.events)
      .values(
        capped.map((occ) => ({
          userId: session.userId,
          title: title.trim(),
          startAt: occ.startAt,
          endAt: occ.endAt,
          type: eventType,
          recurrenceRule: `WEEKLY_${daysToRepeat.join(",")}_UNTIL_${recurrenceEndDate}`,
          createdVia: "manual" as const,
        })),
      )
      .returning();

    return NextResponse.json({ created: inserted.length, events: inserted }, { status: 201 });
  }

  // Single event
  const [event] = await db
    .insert(schema.events)
    .values({
      userId: session.userId,
      title: title.trim(),
      startAt: startDate,
      endAt: effectiveEnd,
      type: eventType,
      recurrenceRule: null,
      createdVia: "manual",
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
