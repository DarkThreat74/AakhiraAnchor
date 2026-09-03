import { NextRequest, NextResponse } from "next/server";
import { eq, and, or } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { sendPrayerPush } from "@/lib/notifications/push";

export const dynamic = "force-dynamic";

// POST /api/prayer-friends/add — send a friend request by prayer code
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("prayer-friend-add", ip, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { code } = body as { code?: string };
  if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code format." }, { status: 400 });
  }

  // Find the friend by their prayer code
  const [friendUser] = await db
    .select({
      id: schema.users.id,
      firstName: schema.users.firstName,
      displayName: schema.users.displayName,
    })
    .from(schema.users)
    .where(eq(schema.users.prayerCode, code))
    .limit(1);

  if (!friendUser) {
    return NextResponse.json({ error: "No user found with that code." }, { status: 404 });
  }

  if (friendUser.id === session.userId) {
    return NextResponse.json({ error: "You can't add yourself." }, { status: 400 });
  }

  // Check if a request already exists in either direction
  const [existing] = await db
    .select({
      id: schema.prayerFriends.id,
      status: schema.prayerFriends.status,
      userId: schema.prayerFriends.userId,
      friendId: schema.prayerFriends.friendId,
    })
    .from(schema.prayerFriends)
    .where(
      or(
        and(
          eq(schema.prayerFriends.userId, session.userId),
          eq(schema.prayerFriends.friendId, friendUser.id),
        ),
        and(
          eq(schema.prayerFriends.userId, friendUser.id),
          eq(schema.prayerFriends.friendId, session.userId),
        ),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "Already friends." }, { status: 409 });
    }
    if (existing.status === "pending") {
      // If the OTHER person sent the request to ME, auto-accept
      if (existing.userId === friendUser.id && existing.friendId === session.userId) {
        await db
          .update(schema.prayerFriends)
          .set({ status: "accepted", respondedAt: new Date() })
          .where(eq(schema.prayerFriends.id, existing.id));
        // Insert the reverse row
        await db
          .insert(schema.prayerFriends)
          .values({
            userId: session.userId,
            friendId: friendUser.id,
            status: "accepted",
            respondedAt: new Date(),
          })
          .onConflictDoNothing();
        return NextResponse.json({ ok: true, friend: { id: friendUser.id, firstName: friendUser.firstName, displayName: friendUser.displayName } });
      }
      return NextResponse.json({ error: "Friend request already sent." }, { status: 409 });
    }
    if (existing.status === "rejected") {
      // If it was rejected before, allow re-sending by updating to pending
      await db
        .update(schema.prayerFriends)
        .set({ status: "pending", respondedAt: null })
        .where(eq(schema.prayerFriends.id, existing.id));
      return NextResponse.json({ ok: true, pending: true, message: "Friend request sent." });
    }
  }

  // Create a pending friend request (one row — the target must accept)
  await db
    .insert(schema.prayerFriends)
    .values({
      userId: session.userId,
      friendId: friendUser.id,
      status: "pending",
    })
    .onConflictDoNothing();

  // Send push notification to the target user
  try {
    const [requester] = await db
      .select({ firstName: schema.users.firstName, displayName: schema.users.displayName })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);

    const requesterName = requester?.firstName || requester?.displayName || "Someone";
    const subs = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, friendUser.id));

    for (const sub of subs) {
      await sendPrayerPush(sub, JSON.stringify({
        title: "New friend request",
        body: `${requesterName} wants to connect with you on Waqt. Tap to accept or reject.`,
        url: "/prayer",
      }));
    }
  } catch {
    // Push notification is best-effort
  }

  return NextResponse.json({
    ok: true,
    pending: true,
    message: "Friend request sent. They'll need to accept it.",
    friend: {
      id: friendUser.id,
      firstName: friendUser.firstName,
      displayName: friendUser.displayName,
    },
  });
}
