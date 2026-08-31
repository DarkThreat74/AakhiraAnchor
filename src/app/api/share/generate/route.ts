import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { slugifyName } from "@/lib/slugify";

export const dynamic = "force-dynamic";

// Generate a cryptographically secure 128-bit share token (32-char hex).
// The previous 5-digit numeric code was enumerable (100k possibilities) and
// allowed IDOR-style access to any user's shared calendar/prayer times.
function generateShareToken(): string {
  return randomBytes(16).toString("hex");
}

// POST /api/share/generate — create or regenerate the public share code.
// Regenerating overwrites the old code, which deactivates the previous link.
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

  // Get the user's display name for the URL
  const [userRow] = await db
    .select({ displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  const nameSlug = slugifyName(userRow?.displayName || "shared");

  // Generate a unique 128-bit token (collisions checked against DB)
  let token = generateShareToken();
  for (let attempt = 0; attempt < 10; attempt++) {
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.publicShareToken, token))
      .limit(1);
    if (!existing) break;
    token = generateShareToken();
  }

  // Overwrite the old token — this deactivates any previously shared link
  await db
    .update(schema.users)
    .set({ publicShareToken: token })
    .where(eq(schema.users.id, session.userId));

  return NextResponse.json({ token, url: `/${nameSlug}/${token}/public` });
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
    .select({
      publicShareToken: schema.users.publicShareToken,
      displayName: schema.users.displayName,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const nameSlug = slugifyName(user.displayName || "shared");

  return NextResponse.json({
    enabled: !!user.publicShareToken,
    token: user.publicShareToken,
    url: user.publicShareToken ? `/${nameSlug}/${user.publicShareToken}/public` : null,
  });
}
