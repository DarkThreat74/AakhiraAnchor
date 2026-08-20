import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { isValidUUID } from "@/lib/validation";

export const dynamic = "force-dynamic";

// PATCH /api/events/[id] — update an existing event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  }

  // Rate limit: 20 updates per hour per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-update", ip, 20, 60 * 60 * 1000)) {
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
    recurrenceRule?: string | null;
  };

  // Build update object — only update provided fields
  const updates: Record<string, unknown> = {};

  if (title !== undefined) {
    if (!title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    updates.title = title.trim();
  }

  if (startAt !== undefined) {
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid start time." }, { status: 400 });
    }
    updates.startAt = startDate;
  }

  if (endAt !== undefined) {
    const endDate = new Date(endAt);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid end time." }, { status: 400 });
    }
    updates.endAt = endDate;
  }

  // Validate that end > start if both provided
  if (updates.startAt && updates.endAt) {
    if ((updates.endAt as Date) <= (updates.startAt as Date)) {
      return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
    }
  }

  if (type !== undefined) {
    const validTypes = ["block", "task", "reminder"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
    }
    updates.type = type;
  }

  if (recurrenceRule !== undefined) {
    updates.recurrenceRule = recurrenceRule?.trim() || null;
  }

  // Update — scoped to the current user
  const [updated] = await db
    .update(schema.events)
    .set(updates)
    .where(
      and(
        eq(schema.events.id, id),
        eq(schema.events.userId, session.userId),
      ),
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/events/[id] — delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: "Invalid event ID." }, { status: 400 });
  }

  // Rate limit: 20 deletes per hour per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-delete", ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const [deleted] = await db
    .delete(schema.events)
    .where(
      and(
        eq(schema.events.id, id),
        eq(schema.events.userId, session.userId),
      ),
    )
    .returning({ id: schema.events.id });

  if (!deleted) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
