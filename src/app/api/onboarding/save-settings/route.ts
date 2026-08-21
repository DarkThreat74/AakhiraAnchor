import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST — save prayer settings (location, timezone, calculation method)
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("onboarding-settings", ip, 10, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { latitude, longitude, timezone, calculationMethod } = body as {
    latitude?: string;
    longitude?: string;
    timezone?: string;
    calculationMethod?: number;
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

  // Validate calculation method (AlAdhan method IDs)
  const validMethods = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const method = calculationMethod && validMethods.includes(calculationMethod) ? calculationMethod : 2;

  // Upsert prayer settings
  const [existing] = await db
    .select()
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(schema.prayerSettings)
      .set({ latitude, longitude, timezone, calculationMethod: method, updatedAt: new Date() })
      .where(eq(schema.prayerSettings.userId, session.userId));
  } else {
    await db.insert(schema.prayerSettings).values({
      userId: session.userId,
      latitude,
      longitude,
      timezone,
      calculationMethod: method,
    });
  }

  return NextResponse.json({ ok: true, calculationMethod: method });
}
