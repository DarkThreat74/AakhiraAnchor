import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/qadaa/adjust — adjust the qadaa count (positive = add, negative = log prayed)
// Body: { amount: number } — capped at ±20 per submission
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

  const { amount } = body as { amount?: number };

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount === 0) {
    return NextResponse.json({ error: "Amount must be a non-zero integer." }, { status: 400 });
  }

  // Cap at ±20
  const cappedAmount = Math.max(-20, Math.min(20, amount));

  // Get existing ledger
  const [existing] = await db
    .select()
    .from(schema.qadaaLedger)
    .where(eq(schema.qadaaLedger.userId, session.userId))
    .limit(1);

  let newTotal: number;

  if (existing) {
    newTotal = Math.max(0, existing.totalOwed + cappedAmount);
    await db
      .update(schema.qadaaLedger)
      .set({ totalOwed: newTotal, updatedAt: new Date() })
      .where(eq(schema.qadaaLedger.userId, session.userId));
  } else {
    newTotal = Math.max(0, cappedAmount);
    await db.insert(schema.qadaaLedger).values({
      userId: session.userId,
      totalOwed: newTotal,
      onboardingEstimate: 0,
    });
  }

  // Log the entry if it's a "prayed" adjustment (negative)
  if (cappedAmount < 0) {
    await db.insert(schema.qadaaLogEntries).values({
      userId: session.userId,
      amountLogged: Math.abs(cappedAmount),
    });
  }

  return NextResponse.json({
    totalOwed: newTotal,
    onboardingEstimate: existing?.onboardingEstimate || 0,
  });
}
