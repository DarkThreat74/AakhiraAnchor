import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST — save oath settings
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

  const { oathAmount } = body as { oathAmount?: number };

  if (!oathAmount || oathAmount < 1) {
    return NextResponse.json({ error: "Invalid oath amount." }, { status: 400 });
  }

  // Upsert oath settings
  const [existing] = await db
    .select()
    .from(schema.oathSettings)
    .where(eq(schema.oathSettings.userId, session.userId))
    .limit(1);

  const amountStr = oathAmount.toFixed(2);

  if (existing) {
    await db
      .update(schema.oathSettings)
      .set({ amountPerMissed: amountStr, setAt: new Date() })
      .where(eq(schema.oathSettings.userId, session.userId));
  } else {
    await db.insert(schema.oathSettings).values({
      userId: session.userId,
      amountPerMissed: amountStr,
    });
  }

  return NextResponse.json({ ok: true });
}
