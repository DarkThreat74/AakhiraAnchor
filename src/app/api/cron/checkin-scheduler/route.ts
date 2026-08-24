import { NextRequest, NextResponse } from "next/server";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { env } from "@/lib/env";
import { getCheckinStage, isWindowClosed, getPrayerWindow, STAGES } from "@/lib/prayer/stateMachine";

export const dynamic = "force-dynamic";

// POST /api/cron/checkin-scheduler — runs once daily on Vercel Hobby
// (Vercel Hobby limits crons to once per day. The client-side NotificationScheduler
//  handles real-time prayer notifications while the app is open. This cron handles
//  the daily pass: assumed_prayed resolution, event notifications for today, and
//  any push notifications that can be batched.)
// 1. Prayer check-in notifications (early/mid/closing stages)
// 2. Event/reminder notifications (15 min before start time)
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

  // ─── 1. Prayer check-in notifications ───
  const allSettings = await db.select().from(schema.prayerSettings);

  for (const settings of allSettings) {
    // Get current time in the user's timezone
    const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: settings.timezone }));
    const today = userNow.toISOString().split("T")[0];

    // Get today's cached prayer times for this user
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

    const timings = {
      fajr: cached.fajr,
      sunrise: cached.sunrise,
      dhuhr: cached.dhuhr,
      asr: cached.asr,
      maghrib: cached.maghrib,
      isha: cached.isha,
    };

    const now = userNow;
    const prayers: Array<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha"> = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    // Get notification prefs for this user
    const [prefs] = await db
      .select()
      .from(schema.notificationPrefs)
      .where(eq(schema.notificationPrefs.userId, settings.userId))
      .limit(1);

    // Default to 'push' if no prefs set
    const earlyMidPref = prefs?.prayerEarlyMid || "push";
    const finalPref = prefs?.prayerFinal || "push";

    for (const prayerName of prayers) {
      const window = getPrayerWindow(prayerName, timings);

      // Query existing log ONCE for this prayer
      const [existingLog] = await db
        .select()
        .from(schema.prayerLog)
        .where(
          and(
            eq(schema.prayerLog.userId, settings.userId),
            eq(schema.prayerLog.date, today),
            eq(schema.prayerLog.prayerName, prayerName),
          ),
        )
        .limit(1);

      // Check if window has closed → mark as assumed_prayed
      if (isWindowClosed(window, now)) {
        if (existingLog && existingLog.status === "pending") {
          // Silently mark as assumed_prayed — no ledger charge
          await db
            .update(schema.prayerLog)
            .set({ status: "assumed_prayed" })
            .where(eq(schema.prayerLog.id, existingLog.id));
        }
        continue;
      }

      // Skip if already prayed
      if (existingLog?.status === "prayed") continue;

      const currentStage = existingLog?.checkinStage || STAGES.NONE;
      const dueStage = getCheckinStage(window, now, currentStage);

      if (dueStage === STAGES.NONE) continue;

      // Check notification preference for this stage
      const isClosingStage = dueStage === STAGES.CLOSING;
      const stagePref = isClosingStage ? finalPref : earlyMidPref;

      // Skip if user disabled push for this stage
      if (stagePref === "none") continue;

      // Update checkin stage
      if (existingLog) {
        await db
          .update(schema.prayerLog)
          .set({ checkinStage: dueStage, lastCheckinAt: now })
          .where(eq(schema.prayerLog.id, existingLog.id));
      } else {
        await db.insert(schema.prayerLog).values({
          userId: settings.userId,
          date: today,
          prayerName,
          status: "pending",
          checkinStage: dueStage,
          lastCheckinAt: now,
        });
      }

      // Send push notification
      const subs = await db
        .select()
        .from(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.userId, settings.userId));

      const stageLabels: Record<number, string> = {
        [STAGES.EARLY]: "Time to pray",
        [STAGES.MID]: "Half the window has passed",
        [STAGES.CLOSING]: "Last chance to pray",
      };

      const payload = JSON.stringify({
        title: `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} — ${stageLabels[dueStage]}`,
        body: `The ${prayerName} prayer window is open.`,
        tag: `prayer-${prayerName}-${today}`,
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

    // ─── 2. Event/reminder notifications for this user ───
    // Notify about events starting in the next 15 minutes
    notificationsSent += await sendEventNotifications(settings.userId, settings.timezone, userNow);
  }

  return NextResponse.json({ ok: true, notificationsSent });
}

// ─── Event/reminder notification helper ───
// Sends a push notification for events starting within the next 15 minutes.
// Uses a notification_sent flag on events to avoid duplicate notifications.
async function sendEventNotifications(
  userId: string,
  timezone: string,
  userNow: Date,
): Promise<number> {
  // Query events in a ±1 hour window around now to catch upcoming ones
  const fromTime = new Date(userNow.getTime() - 5 * 60 * 1000); // 5 min ago
  const toTime = new Date(userNow.getTime() + 20 * 60 * 1000);  // 20 min ahead

  // Convert user-local times to UTC for the DB query
  // The DB stores UTC timestamps; userNow is already in the user's timezone
  // but as a Date object (which is always UTC internally)
  const fromUtc = new Date(fromTime.getTime());
  const toUtc = new Date(toTime.getTime());

  const upcomingEvents = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      startAt: schema.events.startAt,
      type: schema.events.type,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.userId, userId),
        gte(schema.events.startAt, fromUtc),
        lte(schema.events.startAt, toUtc),
        isNull(schema.events.notifiedAt),
      ),
    );

  if (upcomingEvents.length === 0) return 0;

  // Get notification prefs
  const [prefs] = await db
    .select()
    .from(schema.notificationPrefs)
    .where(eq(schema.notificationPrefs.userId, userId))
    .limit(1);

  // "other reminders" pref controls event notifications
  const otherPref = prefs?.otherReminders || "push";
  if (otherPref === "none") return 0;

  // Get push subscriptions
  const subs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(eq(schema.pushSubscriptions.userId, userId));

  if (subs.length === 0) return 0;

  let sent = 0;

  for (const event of upcomingEvents) {
    // Check if we already sent a notification for this event
    // Use a simple tag-based dedup: we store the notification tag in the event's
    // recurrence_rule field if it's null (hacky but avoids a schema migration).
    // Better: check if the event starts within the next 15 min and we haven't
    // notified yet. We'll use a separate table or a simple approach:
    // Only notify for events starting 0-15 min from now, and use the push tag
    // to deduplicate on the client side.

    const eventStart = new Date(event.startAt);
    const diffMs = eventStart.getTime() - userNow.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Only notify for events 0-15 min away
    if (diffMin < 0 || diffMin > 15) continue;

    const typeLabel = event.type === "reminder" ? "Reminder" : event.type === "task" ? "Task" : "Event";
    const payload = JSON.stringify({
      title: `${typeLabel}: ${event.title}`,
      body: diffMin === 0 ? "Starting now" : `Starting in ${diffMin} min`,
      tag: `event-${event.id}`,
      data: { url: "/calendar/day" },
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        const e = err as { statusCode?: number };
        if (e.statusCode === 404 || e.statusCode === 410) {
          await db
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.id, sub.id));
        }
      }
    }

    // Mark this event as notified so we don't send again
    await db
      .update(schema.events)
      .set({ notifiedAt: new Date() })
      .where(eq(schema.events.id, event.id));
  }

  return sent;
}
