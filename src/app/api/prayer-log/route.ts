import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/prayer-log?date=YYYY-MM-DD — get prayer log for a day
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");

  if (!dateStr) {
    return NextResponse.json({ error: "Missing date parameter." }, { status: 400 });
  }

  const logs = await db
    .select()
    .from(schema.prayerLog)
    .where(
      and(
        eq(schema.prayerLog.userId, session.userId),
        eq(schema.prayerLog.date, dateStr),
      ),
    );

  return NextResponse.json(logs);
}
