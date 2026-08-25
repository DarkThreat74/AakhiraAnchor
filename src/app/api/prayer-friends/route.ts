import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { calculateStreak } from "@/lib/prayer/checkin";

export const dynamic = "force-dynamic";

// GET /api/prayer-friends — list the current user's prayer friends with real metrics
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
    totalPrayed: number;
    masjidPct: number;
    thisWeekPrayed: number;
    lastPrayedDate: string | null;
    todayLogs: Array<{ prayerName: string; status: string }>;
    todaySunnahs: string[];
    timezone: string;
  }> = [];

  // 7 days ago for weekly count
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgoStr = sevenDaysAgo.toISOString().split("T")[0];

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
    let totalPrayed = 0;
    let totalMasjid = 0;
    let thisWeekPrayed = 0;
    let lastPrayedDate: string | null = null;

    for (const log of friendLogs) {
      const dateStr = typeof log.date === "string" ? log.date : String(log.date);
      if (!logsByDate.has(dateStr)) logsByDate.set(dateStr, []);
      logsByDate.get(dateStr)!.push({ status: log.status });

      if (log.status === "prayed" || log.status === "assumed_prayed") {
        totalPrayed++;
        if (log.wentToMasjid === true) totalMasjid++;
        if (dateStr >= weekAgoStr) thisWeekPrayed++;
        if (!lastPrayedDate || dateStr > lastPrayedDate) lastPrayedDate = dateStr;
      }
    }

    // Count complete days (all 5 prayed)
    for (const [, logs] of logsByDate) {
      const prayedCount = logs.filter((l) => l.status === "prayed" || l.status === "assumed_prayed").length;
      if (prayedCount === 5) completeDays++;
    }

    const streak = calculateStreak(logsByDate, todayStr);

    // Get today's prayer logs for this friend
    const todayLogs = await db
      .select({
        prayerName: schema.prayerLog.prayerName,
        status: schema.prayerLog.status,
      })
      .from(schema.prayerLog)
      .where(
        and(
          eq(schema.prayerLog.userId, f.friendId),
          eq(schema.prayerLog.date, todayStr),
        ),
      );

    // Get today's sunnah logs for this friend
    const todaySunnahLogs = await db
      .select({ sunnahKey: schema.sunnahLog.sunnahKey })
      .from(schema.sunnahLog)
      .where(
        and(
          eq(schema.sunnahLog.userId, f.friendId),
          eq(schema.sunnahLog.date, todayStr),
          eq(schema.sunnahLog.prayed, true),
        ),
      );

    friends.push({
      id: friendUser.id,
      firstName: friendUser.firstName,
      displayName: friendUser.displayName,
      streak,
      totalCompleteDays: completeDays,
      totalPrayed,
      masjidPct: totalPrayed > 0 ? Math.round((totalMasjid / totalPrayed) * 100) : 0,
      thisWeekPrayed,
      lastPrayedDate,
      todayLogs: todayLogs.map((l) => ({ prayerName: l.prayerName, status: l.status })),
      todaySunnahs: todaySunnahLogs.map((l) => l.sunnahKey),
      timezone,
    });
  }

  // Sort by streak descending so the leaderboard is competitive
  friends.sort((a, b) => b.streak - a.streak || b.thisWeekPrayed - a.thisWeekPrayed);

  return NextResponse.json(friends);
}
