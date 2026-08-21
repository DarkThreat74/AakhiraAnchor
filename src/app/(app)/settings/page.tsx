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
      // Format times: "04:50:00" → "4:50 AM"
      const fmt = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const hour = h % 12 || 12;
        const period = h < 12 ? "AM" : "PM";
        return `${hour}:${String(m).padStart(2, "0")} ${period}`;
      };
      todayPrayerTimes = {
        fajr: fmt(todayTimes.fajr),
        sunrise: fmt(todayTimes.sunrise),
        dhuhr: fmt(todayTimes.dhuhr),
        asr: fmt(todayTimes.asr),
        maghrib: fmt(todayTimes.maghrib),
        isha: fmt(todayTimes.isha),
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
