import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { requireAdmin, AdminAuthError } from "@/lib/auth/admin";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logError";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const talks = await db.select().from(schema.talks).orderBy(schema.talks.addedAt);
    return NextResponse.json(talks);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    logError(e, { route: "admin/talks", method: "GET" });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

// POST — add a talk (rate limited: 20 creates per hour per IP)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("admin-talks-create", ip, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
    }
    const body = await request.json();
    const { title, speaker, category, externalUrl } = body as {
      title?: string; speaker?: string; category?: string; externalUrl?: string;
    };
    if (!title?.trim() || !externalUrl?.trim()) {
      return NextResponse.json({ error: "Title and external URL are required." }, { status: 400 });
    }
    try { new URL(externalUrl); } catch {
      return NextResponse.json({ error: "External URL must be a valid URL." }, { status: 400 });
    }
    const [talk] = await db.insert(schema.talks).values({
      title: title.trim(),
      speaker: speaker?.trim() || null,
      category: category?.trim() || null,
      externalUrl: externalUrl.trim(),
    }).returning();
    return NextResponse.json(talk);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    logError(e, { route: "admin/talks", method: "POST" });
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
