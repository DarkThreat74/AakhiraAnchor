import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// POST — send a test push notification to the current user
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  if (!checkRateLimit("notif-test", ip, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many test notifications. Please wait a few minutes." }, { status: 429 });
  }

  // Configure web-push
  webpush.setVapidDetails(
    env.vapidSubject,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  );

  // Get all subscriptions for this user
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, session.userId));

  if (subs.length === 0) {
    return NextResponse.json(
      { error: "No push subscriptions found. Allow notifications and try again." },
      { status: 404 },
    );
  }

  const payload = JSON.stringify({
    title: "Waqt",
    body: "Push notifications are working. You'll be reminded when it's time to pray.",
    tag: "waqt-test",
    data: { url: "/" },
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      ),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Clean up expired subscriptions
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db
          .delete(schema.pushSubscriptions)
          .where(eq(schema.pushSubscriptions.id, subs[i].id));
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent: succeeded,
    failed,
  });
}
