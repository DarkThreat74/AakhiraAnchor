import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST — save notification preferences
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

  const { prayerEarlyMid, prayerFinal, otherReminders } = body as {
    prayerEarlyMid?: string;
    prayerFinal?: string;
    otherReminders?: string;
  };

  const validValues = ["push", "push_sms", "sms", "none"];
  const earlyMid = validValues.includes(prayerEarlyMid || "") ? prayerEarlyMid! : "push";
  const finalVal = validValues.includes(prayerFinal || "") ? prayerFinal! : "push";
  const other = validValues.includes(otherReminders || "") ? otherReminders! : "push";

  // Upsert notification prefs
  const [existing] = await db
    .select()
    .from(schema.notificationPrefs)
    .where(eq(schema.notificationPrefs.userId, session.userId))
    .limit(1);

  if (existing) {
    await db
      .update(schema.notificationPrefs)
      .set({ prayerEarlyMid: earlyMid, prayerFinal: finalVal, otherReminders: other })
      .where(eq(schema.notificationPrefs.userId, session.userId));
  } else {
    await db.insert(schema.notificationPrefs).values({
      userId: session.userId,
      prayerEarlyMid: earlyMid,
      prayerFinal: finalVal,
      otherReminders: other,
    });
  }

  return NextResponse.json({ ok: true });
}
