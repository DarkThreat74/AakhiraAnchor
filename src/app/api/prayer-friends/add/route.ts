import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { calculateStreak } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// POST /api/prayer-friends/add — add a friend by their prayer code
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

  // Check if already friends
  const [existing] = await db
    .select()
    .from(schema.prayerFriends)
    .where(
      and(
        eq(schema.prayerFriends.userId, session.userId),
        eq(schema.prayerFriends.friendId, friendUser.id),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "Already friends." }, { status: 409 });
  }

  // Add the friendship
  await db.insert(schema.prayerFriends).values({
    userId: session.userId,
    friendId: friendUser.id,
  });

  // Get friend's streak for the response
  const friendLogs = await db
    .select()
    .from(schema.prayerLog)
    .where(eq(schema.prayerLog.userId, friendUser.id));

  const [friendSettings] = await db
    .select({ timezone: schema.prayerSettings.timezone })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, friendUser.id))
    .limit(1);

  const timezone = friendSettings?.timezone || "America/Chicago";
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  const logsByDate = new Map<string, Array<{ status: string }>>();
  let completeDays = 0;
  for (const log of friendLogs) {
    const dateStr = typeof log.date === "string" ? log.date : String(log.date);
    if (!logsByDate.has(dateStr)) logsByDate.set(dateStr, []);
    logsByDate.get(dateStr)!.push({ status: log.status });
  }
  for (const [, logs] of logsByDate) {
    if (logs.filter((l) => l.status === "prayed" || l.status === "assumed_prayed").length === 5) completeDays++;
  }

  const streak = calculateStreak(logsByDate, todayStr);

  return NextResponse.json({
    ok: true,
    friend: {
      id: friendUser.id,
      firstName: friendUser.firstName,
      displayName: friendUser.displayName,
      streak,
      totalCompleteDays: completeDays,
    },
  });
}
