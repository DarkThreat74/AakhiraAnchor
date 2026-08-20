import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { requireAdmin, AdminAuthError } from "@/lib/auth/admin";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const tasks = await db.select().from(schema.huddleTaskPool).orderBy(schema.huddleTaskPool.id);
    return NextResponse.json(tasks);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// POST — create a huddle task (rate limited: 20 creates per hour per IP)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("admin-huddle-create", ip, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }
    const body = await request.json();
    const { title, category, isDefaultFree } = body as {
      title?: string; category?: string; isDefaultFree?: boolean;
    };
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    const [task] = await db.insert(schema.huddleTaskPool).values({
      title: title.trim(),
      category: category?.trim() || null,
      isDefaultFree: isDefaultFree ?? false,
    }).returning();
    return NextResponse.json(task);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
