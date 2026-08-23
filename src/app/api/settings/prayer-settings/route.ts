import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/settings/prayer-settings — get the user's prayer settings (timezone, method, etc.)
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings] = await db
    .select({
      timezone: schema.prayerSettings.timezone,
      calculationMethod: schema.prayerSettings.calculationMethod,
      madhab: schema.prayerSettings.madhab,
    })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  if (!settings) {
    return NextResponse.json({ error: "Settings not found." }, { status: 404 });
  }

  return NextResponse.json(settings);
}
