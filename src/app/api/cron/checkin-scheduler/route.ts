import { NextRequest, NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";
import webpush from "web-push";
import { db, schema } from "@/lib/db/client";
import { verifyCronAuth } from "@/lib/cronAuth";
import { env } from "@/lib/env";
import { isWindowClosed, getPrayerWindow } from "@/lib/prayer/stateMachine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
//
// ─── Optimization for 100k+ users ───
// Processes users in BATCHES of 500 to avoid:
// - Postgres prepared-statement parameter limits (inArray with 100k IDs)
// - Memory exhaustion from loading all data at once
// - Single-function timeout from processing too many users sequentially
const BATCH_SIZE = 500;

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

  // Fetch all user IDs first (lightweight — just IDs, not full settings)
  const allSettings = await db.select({
    userId: schema.prayerSettings.userId,
    timezone: schema.prayerSettings.timezone,
    latitude: schema.prayerSettings.latitude,
    longitude: schema.prayerSettings.longitude,
    calculationMethod: schema.prayerSettings.calculationMethod,
    madhab: schema.prayerSettings.madhab,
  }).from(schema.prayerSettings);

  if (allSettings.length === 0) {
    return NextResponse.json({ ok: true, notificationsSent: 0, assumedResolved: 0 });
  }

  // Process in batches to avoid inArray with 100k+ IDs
  for (let batchStart = 0; batchStart < allSettings.length; batchStart += BATCH_SIZE) {
    const batch = allSettings.slice(batchStart, batchStart + BATCH_SIZE);
    const batchUserIds = batch.map((s) => s.userId);

    try {
      const result = await processUserBatch(batch, batchUserIds);
      notificationsSent += result.notificationsSent;
      assumedResolved += result.assumedResolved;
    } catch (batchErr) {
      console.error("[cron:checkin-scheduler] batch failed at offset", batchStart, batchErr);
    }
  }

  return NextResponse.json({ ok: true, notificationsSent, assumedResolved });
}

async function processUserBatch(
  settings: Array<{ userId: string; timezone: string; latitude: string; longitude: string; calculationMethod: number; madhab: string | null }>,
  userIds: string[],
): Promise<{ notificationsSent: number; assumedResolved: number }> {
  let notificationsSent = 0;
  let assumedResolved = 0;

  // Compute all possible dates we need (today + yesterday for each timezone)
  const allDates = new Set<string>();
  const yesterdayDates = new Set<string>();
  for (const s of settings) {
    const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: s.timezone }));
    const today = userNow.toISOString().split("T")[0];
    const yesterday = new Date(userNow.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    allDates.add(today);
    allDates.add(yesterdayStr);
    yesterdayDates.add(yesterdayStr);
  }
  const dateList = Array.from(allDates);

  // Batch 1: prayer times cache rows for relevant dates
  const allCachedTimes = await db
    .select()
    .from(schema.prayerTimesCache)
    .where(inArray(schema.prayerTimesCache.date, dateList));

  const cachedTimesMap = new Map<string, Map<string, typeof allCachedTimes[0]>>();
  for (const row of allCachedTimes) {
    if (!row.userId) continue;
    if (!cachedTimesMap.has(row.userId)) cachedTimesMap.set(row.userId, new Map());
    cachedTimesMap.get(row.userId)!.set(row.date, row);
  }

  // Batch 2: pending prayer logs for yesterday's dates
  const allPendingLogs = await db
    .select()
    .from(schema.prayerLog)
    .where(
      and(
        inArray(schema.prayerLog.userId, userIds),
        inArray(schema.prayerLog.date, Array.from(yesterdayDates)),
        eq(schema.prayerLog.status, "pending"),
      ),
    );

  const pendingLogsMap = new Map<string, Map<string, Map<string, typeof allPendingLogs[0]>>>();
  for (const log of allPendingLogs) {
    if (!pendingLogsMap.has(log.userId)) pendingLogsMap.set(log.userId, new Map());
    if (!pendingLogsMap.get(log.userId)!.has(log.date)) pendingLogsMap.get(log.userId)!.set(log.date, new Map());
    pendingLogsMap.get(log.userId)!.get(log.date)!.set(log.prayerName, log);
  }

  // Batch 3: notification prefs
  const allPrefs = await db
    .select()
    .from(schema.notificationPrefs)
    .where(inArray(schema.notificationPrefs.userId, userIds));

  const prefsMap = new Map<string, typeof allPrefs[0]>();
  for (const prefs of allPrefs) prefsMap.set(prefs.userId, prefs);

  // Batch 4: push subscriptions
  const allSubs = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(inArray(schema.pushSubscriptions.userId, userIds));

  const subsMap = new Map<string, typeof allSubs[number][]>();
  for (const sub of allSubs) {
    if (!subsMap.has(sub.userId)) subsMap.set(sub.userId, []);
    subsMap.get(sub.userId)!.push(sub);
  }

  // Process each user using the batched data
  for (const s of settings) {
    try {
      const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: s.timezone }));
      const today = userNow.toISOString().split("T")[0];
      const yesterday = new Date(userNow.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // 1. Resolve yesterday's unmarked prayers as assumed_prayed
      const yesterdayCached = cachedTimesMap.get(s.userId)?.get(yesterdayStr);
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
        const logIdsToUpdate: string[] = [];

        for (const prayerName of prayers) {
          const window = getPrayerWindow(prayerName, yesterdayTimings);
          if (!isWindowClosed(window, userNow)) continue;

          const existingLog = pendingLogsMap.get(s.userId)?.get(yesterdayStr)?.get(prayerName);
          if (existingLog) {
            logIdsToUpdate.push(existingLog.id);
          }
        }

        if (logIdsToUpdate.length > 0) {
          await db
            .update(schema.prayerLog)
            .set({ status: "assumed_prayed" })
            .where(inArray(schema.prayerLog.id, logIdsToUpdate));
          assumedResolved += logIdsToUpdate.length;
        }
      }

      // 2. Send daily prayer schedule push
      const cached = cachedTimesMap.get(s.userId)?.get(today);
      if (!cached) continue;

      const prefs = prefsMap.get(s.userId);
      const earlyMidPref = prefs?.prayerEarlyMid || "push";
      if (earlyMidPref === "none") continue;

      const subs = subsMap.get(s.userId);
      if (!subs || subs.length === 0) continue;

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
            try {
              await db
                .delete(schema.pushSubscriptions)
                .where(eq(schema.pushSubscriptions.id, sub.id));
            } catch (deleteErr) {
              console.error("[cron:checkin-scheduler] failed to delete expired sub", sub.id, deleteErr);
            }
          } else {
            console.error("[cron:checkin-scheduler] push failed", sub.id, e.statusCode, err);
          }
        }
      }
    } catch (userErr) {
      console.error("[cron:checkin-scheduler] user failed", s.userId, userErr);
    }
  }

  return { notificationsSent, assumedResolved };
}
