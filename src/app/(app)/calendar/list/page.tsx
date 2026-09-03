import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import ListViewClient from "./ListViewClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "List · Waqt" };

export default async function ListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Get user's timezone so we compute "today" in their local time, not server UTC
  const [settings] = await db
    .select({ timezone: schema.prayerSettings.timezone })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);
  const userTimezone = settings?.timezone || "UTC";

  // Compute today's date in the user's timezone
  const nowInTz = new Date().toLocaleString("en-US", { timeZone: userTimezone });
  const today = new Date(nowInTz).toISOString().split("T")[0];

  return <ListViewClient today={today} />;
}
