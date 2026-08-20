import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { requireAdmin, AdminAuthError } from "@/lib/auth/admin";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET — list all lessons
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const lessons = await db.select().from(schema.dailyLessons).orderBy(schema.dailyLessons.id);
    return NextResponse.json(lessons);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// POST — create a lesson (rate limited: 20 creates per hour per IP)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("admin-lessons-create", ip, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }
    const body = await request.json();
    const { content, sourceCitation, category } = body as {
      content?: string; sourceCitation?: string; category?: string;
    };
    if (!content?.trim() || !sourceCitation?.trim()) {
      return NextResponse.json({ error: "Content and source citation are required." }, { status: 400 });
    }
    const [lesson] = await db.insert(schema.dailyLessons).values({
      content: content.trim(), sourceCitation: sourceCitation.trim(), category: category?.trim() || null,
    }).returning();
    return NextResponse.json(lesson);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
