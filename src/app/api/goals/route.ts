import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/goals — list all goals for the authenticated user (flat array)
 * POST /api/goals — create a new goal
 * PATCH /api/goals — update a goal
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(schema.goals)
      .where(eq(schema.goals.userId, session.userId))
      .orderBy(schema.goals.sortOrder, schema.goals.createdAt);

    return NextResponse.json({ goals: rows });
  } catch (err) {
    console.error("[goals/GET]", err);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("goals-post", ip, 30, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: {
      title?: string;
      parentId?: string | null;
      description?: string;
      color?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }
    if (body.description && body.description.length > 2000) {
      return NextResponse.json({ error: "Description must be 2000 characters or less" }, { status: 400 });
    }

    // Validate parentId belongs to the user if provided
    if (body.parentId) {
      const [parent] = await db
        .select({ id: schema.goals.id })
        .from(schema.goals)
        .where(and(eq(schema.goals.id, body.parentId), eq(schema.goals.userId, session.userId)))
        .limit(1);
      if (!parent) {
        return NextResponse.json({ error: "Invalid parent goal" }, { status: 400 });
      }
    }

    const [goal] = await db
      .insert(schema.goals)
      .values({
        userId: session.userId,
        parentId: body.parentId ?? null,
        title,
        description: body.description?.trim() || null,
        color: body.color || null,
      })
      .returning();

    return NextResponse.json({ goal });
  } catch (err) {
    console.error("[goals/POST]", err);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("goals-patch", ip, 60, 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    let body: {
      id?: string;
      title?: string;
      description?: string;
      status?: string;
      color?: string;
      parentId?: string | null;
      sortOrder?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, body.id), eq(schema.goals.userId, session.userId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Prevent circular parent references
    if (body.parentId && body.parentId !== null) {
      if (body.parentId === body.id) {
        return NextResponse.json({ error: "A goal cannot be its own parent" }, { status: 400 });
      }
      // Check the potential parent isn't a descendant of this goal
      let currentParent: string | null = body.parentId;
      const visited = new Set<string>();
      while (currentParent && !visited.has(currentParent)) {
        if (currentParent === body.id) {
          return NextResponse.json(
            { error: "Circular reference detected" },
            { status: 400 },
          );
        }
        visited.add(currentParent);
        const [p] = await db
          .select({ parentId: schema.goals.parentId })
          .from(schema.goals)
          .where(and(eq(schema.goals.id, currentParent), eq(schema.goals.userId, session.userId)))
          .limit(1);
        currentParent = p?.parentId ?? null;
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) {
      const trimmed = body.title.trim();
      if (!trimmed) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      updates.title = trimmed.slice(0, 200);
    }
    if (body.description !== undefined) {
      const desc = body.description ?? "";
      if (desc.length > 2000) {
        return NextResponse.json({ error: "Description must be 2000 characters or less" }, { status: 400 });
      }
      updates.description = desc.trim() || null;
    }
    if (body.status !== undefined) {
      if (!["active", "done", "archived"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updates.status = body.status;
      updates.completedAt = body.status === "done" ? new Date() : null;
    }
    if (body.color !== undefined) updates.color = body.color || null;
    if (body.parentId !== undefined) updates.parentId = body.parentId;
    if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

    const [updated] = await db
      .update(schema.goals)
      .set(updates)
      .where(and(eq(schema.goals.id, body.id), eq(schema.goals.userId, session.userId)))
      .returning();

    return NextResponse.json({ goal: updated });
  } catch (err) {
    console.error("[goals/PATCH]", err);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("goals-delete", ip, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    // Verify ownership before delete (cascade will handle children)
    const [existing] = await db
      .select({ id: schema.goals.id })
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.userId, session.userId)))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    await db.delete(schema.goals).where(and(eq(schema.goals.id, id), eq(schema.goals.userId, session.userId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[goals/DELETE]", err);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}
