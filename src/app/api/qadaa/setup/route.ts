import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/qadaa/setup — set the initial qadaa estimate (only works if not already set)
// Body: { estimate: number }
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("qadaa-setup", ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { estimate } = body as { estimate?: number };

  if (typeof estimate !== "number" || !Number.isInteger(estimate) || estimate < 0) {
    return NextResponse.json({ error: "Estimate must be a non-negative integer." }, { status: 400 });
  }

  // Cap at a reasonable maximum (100 years × 365 × 5 = 182500)
  const cappedEstimate = Math.min(182500, estimate);

  // Check if already set
  const [existing] = await db
    .select()
    .from(schema.qadaaLedger)
    .where(eq(schema.qadaaLedger.userId, session.userId))
    .limit(1);

  if (existing && existing.onboardingEstimate > 0) {
    return NextResponse.json(
      { error: "Qadaa estimate already set. Use the prayer dashboard to adjust." },
      { status: 409 },
    );
  }

  if (existing) {
    await db
      .update(schema.qadaaLedger)
      .set({ totalOwed: cappedEstimate, onboardingEstimate: cappedEstimate, updatedAt: new Date() })
      .where(eq(schema.qadaaLedger.userId, session.userId));
  } else {
    await db.insert(schema.qadaaLedger).values({
      userId: session.userId,
      totalOwed: cappedEstimate,
      onboardingEstimate: cappedEstimate,
    });
  }

  return NextResponse.json({ totalOwed: cappedEstimate, onboardingEstimate: cappedEstimate });
}
