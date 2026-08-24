import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { env } from "@/lib/env";
import { isWindowClosed, getPrayerWindow } from "@/lib/prayer/stateMachine";

export const dynamic = "force-dynamic";

// POST /api/cron/checkin-scheduler — runs once daily (Vercel Hobby limitation)
//
// Since this only runs once daily, it CANNOT send real-time prayer notifications.
// Real-time prayer notifications are handled by the client-side NotificationScheduler
// while the app is open or in a background tab.
//
// This cron does two things:
// 1. Sends a daily morning push with today's prayer times (so users start the
//    day knowing when each prayer is)
// 2. Resolves any prayers from yesterday whose windows have closed as
//    assumed_prayed (the "never assume the worst" principle)
//
// Idempotent — safe to run multiple times.
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"), request.headers.get("x-vercel-cron") === "1")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    env.vapidSubject,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  );

  let notificationsSent = 0;
  let assumedResolved = 0;

  const allSettings = await db.select().from(schema.prayerSettings);

  for (const settings of allSettings) {
    // Get current time in the user's timezone
    const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: settings.timezone }));
    const today = userNow.toISOString().split("T")[0];

    // ─── 1. Resolve yesterday's unmarked prayers as assumed_prayed ───
    const yesterday = new Date(userNow.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const [yesterdayCached] = await db
      .select()
      .from(schema.prayerTimesCache)
      .where(
        and(
          eq(schema.prayerTimesCache.userId, settings.userId),
          eq(schema.prayerTimesCache.date, yesterdayStr),
        ),
      )
      .limit(1);

    if (yesterdayCached) {
      const yesterdayTimings = {
        fajr: yesterdayCached.fajr,
        sunrise: yesterdayCached.sunrise,
        dhuhr: yesterdayCached.dhuhr,
        asr: yesterdayCached.asr,
        maghrib: yesterdayCached.maghrib,
        isha: yesterdayCached.isha,
      };

      const prayers: Array<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha"> = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

      for (const prayerName of prayers) {
        const window = getPrayerWindow(prayerName, yesterdayTimings);
        if (!isWindowClosed(window, userNow)) continue;

        const [existingLog] = await db
          .select()
          .from(schema.prayerLog)
          .where(
            and(
              eq(schema.prayerLog.userId, settings.userId),
              eq(schema.prayerLog.date, yesterdayStr),
              eq(schema.prayerLog.prayerName, prayerName),
            ),
          )
          .limit(1);

        if (existingLog && existingLog.status === "pending") {
          await db
            .update(schema.prayerLog)
            .set({ status: "assumed_prayed" })
            .where(eq(schema.prayerLog.id, existingLog.id));
          assumedResolved++;
        }
      }
    }

    // ─── 2. Send daily prayer schedule push ───
    // Sends today's prayer times to all users with push subscriptions.
    // The cron runs once daily at midnight UTC — for UTC+ users it's already
    // the new day, for UTC- users it's still the previous day. Either way,
    // the push contains the prayer times for the user's local "today".
    const [cached] = await db
      .select()
      .from(schema.prayerTimesCache)
      .where(
        and(
          eq(schema.prayerTimesCache.userId, settings.userId),
          eq(schema.prayerTimesCache.date, today),
        ),
      )
      .limit(1);

    if (!cached) continue;

    // Check notification prefs
    const [prefs] = await db
      .select()
      .from(schema.notificationPrefs)
      .where(eq(schema.notificationPrefs.userId, settings.userId))
      .limit(1);

    const earlyMidPref = prefs?.prayerEarlyMid || "push";
    if (earlyMidPref === "none") continue;

    // Get push subscriptions
    const subs = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, settings.userId));

    if (subs.length === 0) continue;

    // Format prayer times for the notification body
    const formatTime = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
    };

    const body = [
      `Fajr: ${formatTime(cached.fajr)}`,
      `Dhuhr: ${formatTime(cached.dhuhr)}`,
      `Asr: ${formatTime(cached.asr)}`,
      `Maghrib: ${formatTime(cached.maghrib)}`,
      `Isha: ${formatTime(cached.isha)}`,
    ].join(" · ");

    const payload = JSON.stringify({
      title: "Today's prayer times",
      body,
      tag: `prayer-times-${today}`,
      data: { url: "/calendar/day" },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        notificationsSent++;
      } catch (err) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 404 || e.statusCode === 410) {
          await db
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.id, sub.id));
        }
      }
    }
  }

  return NextResponse.json({ ok: true, notificationsSent, assumedResolved });
}
