import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/qadaa — get the user's qadaa ledger
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ledger] = await db
    .select()
    .from(schema.qadaaLedger)
    .where(eq(schema.qadaaLedger.userId, session.userId))
    .limit(1);

  if (!ledger) {
    // Return default if no ledger exists yet
    return NextResponse.json({ totalOwed: 0, onboardingEstimate: 0 });
  }

  return NextResponse.json({
    totalOwed: ledger.totalOwed,
    onboardingEstimate: ledger.onboardingEstimate,
  });
}
