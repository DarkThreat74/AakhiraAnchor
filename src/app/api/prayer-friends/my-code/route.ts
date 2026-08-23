import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/prayer-friends/my-code — get the current user's prayer code
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ prayerCode: schema.users.prayerCode })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user?.prayerCode) {
    return NextResponse.json({ error: "No prayer code found." }, { status: 404 });
  }

  return NextResponse.json({ prayerCode: user.prayerCode });
}
