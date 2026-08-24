import { NextRequest, NextResponse } from "next/server";
import { eq, and, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// DELETE /api/prayer-friends/remove?friendId=UUID — remove a prayer friend (both directions)
export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");

  if (!friendId) {
    return NextResponse.json({ error: "Missing friendId." }, { status: 400 });
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(friendId)) {
    return NextResponse.json({ error: "Invalid friendId." }, { status: 400 });
  }

  // Remove both directions — you unfriend them, they unfriend you
  await db
    .delete(schema.prayerFriends)
    .where(
      or(
        and(
          eq(schema.prayerFriends.userId, session.userId),
          eq(schema.prayerFriends.friendId, friendId),
        ),
        and(
          eq(schema.prayerFriends.userId, friendId),
          eq(schema.prayerFriends.friendId, session.userId),
        ),
      ),
    );

  return NextResponse.json({ ok: true });
}
