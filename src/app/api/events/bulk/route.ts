import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { isValidUUID } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/events/bulk?seriesId=... — returns the number of events in a series
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seriesId = request.nextUrl.searchParams.get("seriesId");
  if (!seriesId || !isValidUUID(seriesId)) {
    return NextResponse.json({ error: "Valid seriesId is required." }, { status: 400 });
  }

  const result = await db
    .select({ count: count() })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, session.userId),
        eq(schema.events.seriesId, seriesId),
      ),
    );

  return NextResponse.json({ count: result[0]?.count ?? 0 });
}

// PATCH /api/events/bulk — update all events in a recurring series
// Body: { seriesId: string, title?, type?, color?, notify? }
// Only updates fields that are present in the body. Does NOT change startAt/endAt
// since each occurrence has its own timestamp.
export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-bulk-update", ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { seriesId, title, type, color, notify } = body as {
    seriesId?: string;
    title?: string;
    type?: string;
    color?: string | null;
    notify?: boolean;
  };

  if (!seriesId || !isValidUUID(seriesId)) {
    return NextResponse.json({ error: "Valid seriesId is required." }, { status: 400 });
  }

  // Build update object — only update provided fields
  const updates: Record<string, unknown> = {};

  if (type !== undefined) {
    const validTypes = ["block", "task", "reminder"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid event type." }, { status: 400 });
    }
    updates.type = type;
  }

  if (title !== undefined) {
    if (!title.trim()) {
      return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less." }, { status: 400 });
    }
    updates.title = title.trim();
  }

  if (notify !== undefined) {
    updates.notify = Boolean(notify);
  }

  if (color !== undefined) {
    updates.color = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  // Update all events in the series — scoped to the current user
  const updated = await db
    .update(schema.events)
    .set(updates)
    .where(
      and(
        eq(schema.events.userId, session.userId),
        eq(schema.events.seriesId, seriesId),
      ),
    )
    .returning({ id: schema.events.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: "No events found for this series." }, { status: 404 });
  }

  return NextResponse.json({ updated: updated.length });
}

// DELETE /api/events/bulk — delete all events in a recurring series
// Body: { seriesId: string }
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("events-bulk-delete", ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { seriesId } = body as { seriesId?: string };

  if (!seriesId || !isValidUUID(seriesId)) {
    return NextResponse.json({ error: "Valid seriesId is required." }, { status: 400 });
  }

  const deleted = await db
    .delete(schema.events)
    .where(
      and(
        eq(schema.events.userId, session.userId),
        eq(schema.events.seriesId, seriesId),
      ),
    )
    .returning({ id: schema.events.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "No events found for this series." }, { status: 404 });
  }

  return NextResponse.json({ deleted: deleted.length });
}
