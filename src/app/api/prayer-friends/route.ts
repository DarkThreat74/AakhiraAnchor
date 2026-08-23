import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { calculateStreak } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// GET /api/prayer-friends — list the current user's prayer friends with their streaks
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const friendships = await db
    .select({
      friendId: schema.prayerFriends.friendId,
    })
    .from(schema.prayerFriends)
    .where(eq(schema.prayerFriends.userId, session.userId));

  const friends: Array<{
    id: string;
    firstName: string | null;
    displayName: string | null;
    streak: number;
    totalCompleteDays: number;
  }> = [];

  for (const f of friendships) {
    const [friendUser] = await db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        displayName: schema.users.displayName,
      })
      .from(schema.users)
      .where(eq(schema.users.id, f.friendId))
      .limit(1);

    if (!friendUser) continue;

    // Get friend's prayer logs
    const friendLogs = await db
      .select()
      .from(schema.prayerLog)
      .where(eq(schema.prayerLog.userId, f.friendId));

    // Get friend's timezone
    const [friendSettings] = await db
      .select({ timezone: schema.prayerSettings.timezone })
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.userId, f.friendId))
      .limit(1);

    const timezone = friendSettings?.timezone || "America/Chicago";
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

    // Build logs by date map
    const logsByDate = new Map<string, Array<{ status: string }>>();
    let completeDays = 0;
    for (const log of friendLogs) {
      const dateStr = typeof log.date === "string" ? log.date : String(log.date);
      if (!logsByDate.has(dateStr)) logsByDate.set(dateStr, []);
      logsByDate.get(dateStr)!.push({ status: log.status });
    }

    // Count complete days
    for (const [, logs] of logsByDate) {
      const prayedCount = logs.filter((l) => l.status === "prayed" || l.status === "assumed_prayed").length;
      if (prayedCount === 5) completeDays++;
    }

    const streak = calculateStreak(logsByDate, todayStr);

    friends.push({
      id: friendUser.id,
      firstName: friendUser.firstName,
      displayName: friendUser.displayName,
      streak,
      totalCompleteDays: completeDays,
    });
  }

  return NextResponse.json(friends);
}
