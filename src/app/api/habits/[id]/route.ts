import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logError";

export const dynamic = "force-dynamic";

// PATCH /api/habits/[id] — update a habit by ID param
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("habits-id-patch", ip, 30, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    let body: {
      name?: string;
      description?: string;
      color?: string;
      archived?: boolean;
      targetCount?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(schema.habits)
      .where(and(eq(schema.habits.id, id), eq(schema.habits.userId, session.userId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      if (!trimmed) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      updates.name = trimmed.slice(0, 100);
    }
    if (body.description !== undefined) {
      updates.description = body.description.trim() || null;
    }
    if (body.color !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
        return NextResponse.json({ error: "Invalid color" }, { status: 400 });
      }
      updates.color = body.color;
    }
    if (body.archived !== undefined) updates.archived = body.archived;
    if (body.targetCount !== undefined) {
      if (!Number.isInteger(body.targetCount) || body.targetCount < 1) {
        return NextResponse.json({ error: "targetCount must be a positive integer" }, { status: 400 });
      }
      updates.targetCount = body.targetCount;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(existing);
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(schema.habits)
      .set(updates)
      .where(and(eq(schema.habits.id, id), eq(schema.habits.userId, session.userId)))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    logError(err, { route: "habits/[id]/PATCH" });
    return NextResponse.json({ error: "Failed to update habit" }, { status: 500 });
  }
}

// DELETE /api/habits/[id] — delete a habit by ID param
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("habits-id-delete", ip, 20, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Habit ID is required" }, { status: 400 });
    }

    // Verify ownership + delete with userId in WHERE
    const [deleted] = await db
      .delete(schema.habits)
      .where(and(eq(schema.habits.id, id), eq(schema.habits.userId, session.userId)))
      .returning({ id: schema.habits.id });

    if (!deleted) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logError(err, { route: "habits/[id]/DELETE" });
    return NextResponse.json({ error: "Failed to delete habit" }, { status: 500 });
  }
}
