import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const VALID_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type PrayerName = (typeof VALID_PRAYERS)[number];

// POST /api/qadaa/adjust — adjust the qadaa count for a specific prayer
// Body: { prayer: "fajr"|"dhuhr"|"asr"|"maghrib"|"isha", amount: number }
// amount > 0 = add to backlog, amount < 0 = log prayed (reduces owed), capped at ±20
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("qadaa-adjust", ip, 20, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { prayer, amount } = body as { prayer?: string; amount?: number };

  if (!prayer || !VALID_PRAYERS.includes(prayer as PrayerName)) {
    return NextResponse.json({ error: "Invalid prayer name." }, { status: 400 });
  }

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0) {
    return NextResponse.json({ error: "Amount must be a non-zero integer." }, { status: 400 });
  }

  // Cap at ±20
  const cappedAmount = Math.max(-20, Math.min(20, amount));
  const prayerName = prayer as PrayerName;

  // Get existing ledger
  const [existing] = await db
    .select()
    .from(schema.qadaaLedger)
    .where(eq(schema.qadaaLedger.userId, session.userId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Qadaa not set up yet." }, { status: 404 });
  }

  // Map prayer name to column
  const columnMap = {
    fajr: "fajrOwed",
    dhuhr: "dhuhrOwed",
    asr: "asrOwed",
    maghrib: "maghribOwed",
    isha: "ishaOwed",
  } as const;

  const currentValues: Record<string, number> = {
    fajrOwed: existing.fajrOwed,
    dhuhrOwed: existing.dhuhrOwed,
    asrOwed: existing.asrOwed,
    maghribOwed: existing.maghribOwed,
    ishaOwed: existing.ishaOwed,
  };

  const colName = columnMap[prayerName];
  const currentValue = currentValues[colName];
  const newValue = Math.max(0, currentValue + cappedAmount);

  await db
    .update(schema.qadaaLedger)
    .set({
      [colName]: newValue,
      updatedAt: new Date(),
    })
    .where(eq(schema.qadaaLedger.userId, session.userId));

  // Log the entry if it's a "prayed" adjustment (negative)
  if (cappedAmount < 0) {
    await db.insert(schema.qadaaLogEntries).values({
      userId: session.userId,
      prayerName: prayerName,
      amountLogged: Math.abs(cappedAmount),
    });
  }

  return NextResponse.json({
    fajrOwed: colName === "fajrOwed" ? newValue : existing.fajrOwed,
    dhuhrOwed: colName === "dhuhrOwed" ? newValue : existing.dhuhrOwed,
    asrOwed: colName === "asrOwed" ? newValue : existing.asrOwed,
    maghribOwed: colName === "maghribOwed" ? newValue : existing.maghribOwed,
    ishaOwed: colName === "ishaOwed" ? newValue : existing.ishaOwed,
    setupCompleted: existing.setupCompleted,
  });
}
