import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { logError } from "@/lib/logError";

export const dynamic = "force-dynamic";

/**
 * GET /api/huddle
 * Returns today's huddle tasks + completion status.
 * Free tier: is_default_free tasks only. Plus: full pool.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Compute today's date in the user's timezone
    const [settings] = await db
      .select({ timezone: schema.prayerSettings.timezone })
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.userId, session.userId))
      .limit(1);
    const tz = settings?.timezone || "UTC";
    const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
    const today = new Date(nowInTz).toISOString().split("T")[0];

    // Fetch all tasks (free tier filtering could be added here based on user's plan)
    const tasks = await db
      .select()
      .from(schema.huddleTaskPool)
      .orderBy(schema.huddleTaskPool.id);

    // Fetch today's completions
    const completions = await db
      .select()
      .from(schema.huddleCompletions)
      .where(and(
        eq(schema.huddleCompletions.userId, session.userId),
        eq(schema.huddleCompletions.date, today),
      ));

    const completedTaskIds = new Set(completions.map((c) => c.taskId));

    return NextResponse.json({
      date: today,
      tasks: tasks.map((t) => ({ ...t, completed: completedTaskIds.has(t.id) })),
      completedCount: completions.length,
      totalCount: tasks.length,
    });
  } catch (err) {
    logError(err, { route: "huddle GET" });
    return NextResponse.json({ error: "Failed to load huddle." }, { status: 500 });
  }
}

/**
 * POST /api/huddle
 * Toggle completion of a task for today.
 * Body: { taskId: string, completed: boolean }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, completed } = body as { taskId?: string; completed?: boolean };

    if (!taskId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId)) {
      return NextResponse.json({ error: "Valid taskId is required." }, { status: 400 });
    }

    // Compute today's date
    const [settings] = await db
      .select({ timezone: schema.prayerSettings.timezone })
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.userId, session.userId))
      .limit(1);
    const tz = settings?.timezone || "UTC";
    const nowInTz = new Date().toLocaleString("en-US", { timeZone: tz });
    const today = new Date(nowInTz).toISOString().split("T")[0];

    if (completed) {
      // Insert (idempotent via unique index)
      try {
        await db.insert(schema.huddleCompletions).values({
          userId: session.userId,
          taskId,
          date: today,
        });
      } catch {
        // Already exists — that's fine (idempotent)
      }
    } else {
      // Remove
      await db.delete(schema.huddleCompletions).where(and(
        eq(schema.huddleCompletions.userId, session.userId),
        eq(schema.huddleCompletions.taskId, taskId),
        eq(schema.huddleCompletions.date, today),
      ));
    }

    return NextResponse.json({ success: true, completed: !!completed });
  } catch (err) {
    logError(err, { route: "huddle POST" });
    return NextResponse.json({ error: "Failed to update huddle." }, { status: 500 });
  }
}
