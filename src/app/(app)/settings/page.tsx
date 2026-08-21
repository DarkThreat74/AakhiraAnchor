import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Gate: redirect to onboarding if not completed
  const [user] = await db
    .select({ onboardingCompleted: schema.users.onboardingCompleted })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (user && !user.onboardingCompleted) redirect("/onboarding");

  // Fetch prayer settings and notification prefs in parallel
  const [prayerSettings, notifPrefs] = await Promise.all([
    db
      .select()
      .from(schema.prayerSettings)
      .where(eq(schema.prayerSettings.userId, session.userId))
      .limit(1),
    db
      .select()
      .from(schema.notificationPrefs)
      .where(eq(schema.notificationPrefs.userId, session.userId))
      .limit(1),
  ]);

  return (
    <SettingsClient
      prayerSettings={prayerSettings[0] || null}
      notificationPrefs={notifPrefs[0] || null}
    />
  );
}
