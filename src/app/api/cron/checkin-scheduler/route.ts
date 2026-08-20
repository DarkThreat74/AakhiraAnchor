import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { env } from "@/lib/env";
import { getCheckinStage, isWindowClosed, getPrayerWindow, STAGES } from "@/lib/prayer/stateMachine";

export const dynamic = "force-dynamic";

// POST /api/cron/checkin-scheduler — runs every 5 min
// For each user: check cached prayer times against current time in their timezone.
// Fire due check-ins per state machine. Idempotent.
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    env.vapidSubject,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  );

  const allSettings = await db.select().from(schema.prayerSettings);
  const today = new Date().toISOString().split("T")[0];
  let notificationsSent = 0;

  for (const settings of allSettings) {
    // Get today's cached prayer times
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

    const now = new Date();
    const prayers: Array<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha"> = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    for (const prayerName of prayers) {
      const window = getPrayerWindow(prayerName, timings);

      // Check if window has closed → mark as assumed_prayed
      if (isWindowClosed(window, now)) {
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

        if (existingLog && existingLog.status === "pending") {
          // Silently mark as assumed_prayed — no ledger charge
          await db
            .update(schema.prayerLog)
            .set({ status: "assumed_prayed" })
            .where(eq(schema.prayerLog.id, existingLog.id));
        }
        continue;
      }

      // Get current stage
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

      const currentStage = existingLog?.checkinStage || STAGES.NONE;
      const dueStage = getCheckinStage(window, now, currentStage);

      if (dueStage === STAGES.NONE) continue;
      if (existingLog?.status === "prayed") continue;

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
  }

  return NextResponse.json({ ok: true, notificationsSent });
}
