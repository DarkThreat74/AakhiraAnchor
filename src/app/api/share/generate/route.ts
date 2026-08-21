import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/share/generate — create or regenerate the public share token
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 generations per hour per IP
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("share-generate", ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Generate a 32-byte URL-safe token
  const token = randomBytes(24).toString("hex");

  await db
    .update(schema.users)
    .set({ publicShareToken: token })
    .where(eq(schema.users.id, session.userId));

  return NextResponse.json({ token, url: `/user/public/${token}` });
}

// DELETE /api/share/generate — disable sharing (clears the token)
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(schema.users)
    .set({ publicShareToken: null })
    .where(eq(schema.users.id, session.userId));

  return NextResponse.json({ ok: true });
}

// GET /api/share/generate — check if sharing is enabled and get current token
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ publicShareToken: schema.users.publicShareToken })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    enabled: !!user.publicShareToken,
    token: user.publicShareToken,
    url: user.publicShareToken ? `/user/public/${user.publicShareToken}` : null,
  });
}
