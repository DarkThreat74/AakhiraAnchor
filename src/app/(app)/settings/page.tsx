import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Fetch prayer settings
  const [prayerSettings] = await db
    .select()
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  // Fetch today's prayer times if settings exist
  let todayPrayerTimes: {
    fajr: string; sunrise: string; dhuhr: string;
    asr: string; maghrib: string; isha: string;
  } | null = null;

  if (prayerSettings) {
    const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: prayerSettings.timezone || "UTC" }));
    const today = userNow.toISOString().split("T")[0];

    const [todayTimes] = await db
      .select()
      .from(schema.prayerTimesCache)
      .where(
        and(
          eq(schema.prayerTimesCache.userId, session.userId),
          eq(schema.prayerTimesCache.date, today),
        ),
      )
      .limit(1);

    if (todayTimes) {
      todayPrayerTimes = {
        fajr: todayTimes.fajr,
        sunrise: todayTimes.sunrise,
        dhuhr: todayTimes.dhuhr,
        asr: todayTimes.asr,
        maghrib: todayTimes.maghrib,
        isha: todayTimes.isha,
      };
    }
  }

  return (
    <SettingsClient
      prayerSettings={prayerSettings || null}
      todayPrayerTimes={todayPrayerTimes}
    />
  );
}
