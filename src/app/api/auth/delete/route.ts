import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, clearSessionCookie } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Account deletion — required by Apple Guideline 5.1.2 and Google Play.
 *
 * Deletes the user row entirely. ON DELETE CASCADE on all foreign keys
 * cleans up prayer_settings, trusted_devices, push_subscriptions, events,
 * goals, onboarding_responses, prayer_friends, prayer_log, etc.
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

    // Delete the user row — ON DELETE CASCADE cleans up ALL related PII:
    // prayer_settings (lat/lng/timezone), trusted_devices (fingerprints),
    // push_subscriptions, events (titles), goals (titles/descriptions),
    // onboarding_responses, prayer_friends, prayer_log, sunnah_log,
    // qadaa_ledger, qadaa_log_entries, huddle_completions, daily_lesson_views,
    // goal_share_tokens, oath_ledger, oath_settings
    await db.delete(schema.users).where(eq(schema.users.id, session.userId));

    // Clear the session cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
