import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST — save a push subscription to the database
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { endpoint, keys } = body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json(
      { error: "Missing subscription fields." },
      { status: 400 },
    );
  }

  // Check if this endpoint is already registered for this user
  const [existing] = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, session.userId),
        eq(schema.pushSubscriptions.endpoint, endpoint),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id });
  }

  // Insert new subscription
  const [sub] = await db
    .insert(schema.pushSubscriptions)
    .values({
      userId: session.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .returning();

  return NextResponse.json({ ok: true, id: sub.id });
}
