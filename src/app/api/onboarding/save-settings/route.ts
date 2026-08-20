import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST — save prayer settings (location, timezone)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { latitude, longitude, timezone } = body as {
    latitude?: string;
    longitude?: string;
    timezone?: string;
  };

  if (!latitude || !longitude || !timezone) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  // Validate coordinates
  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);
  if (isNaN(latNum) || latNum < -90 || latNum > 90) {
    return NextResponse.json({ error: "Invalid latitude." }, { status: 400 });
  }
  if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
    return NextResponse.json({ error: "Invalid longitude." }, { status: 400 });
  }
  if (timezone.length > 100) {
    return NextResponse.json({ error: "Invalid timezone." }, { status: 400 });
  }

  // Upsert prayer settings
  const [existing] = await db
    .select()
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(schema.prayerSettings)
      .set({ latitude, longitude, timezone, updatedAt: new Date() })
      .where(eq(schema.prayerSettings.userId, session.userId));
  } else {
    await db.insert(schema.prayerSettings).values({
      userId: session.userId,
      latitude,
      longitude,
      timezone,
    });
  }

  return NextResponse.json({ ok: true });
}
