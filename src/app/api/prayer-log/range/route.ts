import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/prayer-log/range?from=YYYY-MM-DD&to=YYYY-MM-DD — get prayer logs for a date range
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  if (!fromStr || !toStr) {
    return NextResponse.json({ error: "Missing from or to parameter." }, { status: 400 });
  }

  const logs = await db
    .select()
    .from(schema.prayerLog)
    .where(
      and(
        eq(schema.prayerLog.userId, session.userId),
        gte(schema.prayerLog.date, fromStr),
        lte(schema.prayerLog.date, toStr),
      ),
    );

  return NextResponse.json(logs);
}
