import { NextRequest, NextResponse } from "next/server";
import { count, ne, desc, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdmin, AdminAuthError } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/users — list all non-admin users with details
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const users = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        displayName: schema.users.displayName,
        createdAt: schema.users.createdAt,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(ne(schema.users.role, "admin"))
      .orderBy(desc(schema.users.createdAt));

    // Get prayer log counts and last activity per user
    const userIds = users.map((u) => u.id);
    if (userIds.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Batch query: prayer log count + last checkin per user
    const logStats = await db
      .select({
        userId: schema.prayerLog.userId,
        totalLogs: count(),
        lastCheckin: sql<Date>`max(${schema.prayerLog.lastCheckinAt})`,
        prayedCount: sql<number>`count(*) filter (where ${schema.prayerLog.status} = 'prayed')`,
      })
      .from(schema.prayerLog)
      .where(sql`${schema.prayerLog.userId} = any(${userIds})`)
      .groupBy(schema.prayerLog.userId);

    // Batch query: event count per user
    const eventStats = await db
      .select({
        userId: schema.events.userId,
        eventCount: count(),
      })
      .from(schema.events)
      .where(sql`${schema.events.userId} = any(${userIds})`)
      .groupBy(schema.events.userId);

    // Batch query: friend count per user
    const friendStats = await db
      .select({
        userId: schema.prayerFriends.userId,
        friendCount: count(),
      })
      .from(schema.prayerFriends)
      .where(sql`${schema.prayerFriends.userId} = any(${userIds})`)
      .groupBy(schema.prayerFriends.userId);

    // Merge stats into user objects
    const logMap = new Map(logStats.map((l) => [l.userId, l]));
    const eventMap = new Map(eventStats.map((e) => [e.userId, e.eventCount]));
    const friendMap = new Map(friendStats.map((f) => [f.userId, f.friendCount]));

    const usersWithStats = users.map((u) => {
      const log = logMap.get(u.id);
      return {
        ...u,
        prayerLogCount: log?.totalLogs ?? 0,
        prayedCount: log?.prayedCount ?? 0,
        lastCheckin: log?.lastCheckin ?? null,
        eventCount: eventMap.get(u.id) ?? 0,
        friendCount: friendMap.get(u.id) ?? 0,
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}
