import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Account deletion — required by Apple Guideline 5.1.2 and Google Play.
 *
 * Anonymizes PII (email, name, phone → [deleted]) and revokes the session.
 * The user's prayer logs, calendar events, and qadaa ledger are retained
 * in anonymized form for aggregate analytics (no PII attached).
 *
 * Requires authenticated session + body { confirm: "DELETE" } to prevent
 * accidental deletion.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request.headers);
    if (!checkRateLimit("account-delete", ip, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // Parse body safely
    let body: { confirm?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: "Confirmation required. Send { confirm: 'DELETE' } to delete your account." },
        { status: 400 },
      );
    }

    // Anonymize PII — keep the row so foreign keys don't break,
    // but remove all identifiable information
    await db
      .update(schema.users)
      .set({
        email: `deleted-${session.userId.slice(0, 8)}@waqt.app`,
        passwordHash: "deleted",
        displayName: null,
        firstName: null,
        phone: null,
        phoneVerified: false,
        publicShareToken: null,
        prayerCode: null,
      })
      .where(eq(schema.users.id, session.userId));

    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete("waqt-session");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
