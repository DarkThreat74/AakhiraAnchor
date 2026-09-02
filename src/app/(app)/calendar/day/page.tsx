import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import DayViewClient from "./DayViewClient";
import DayDateHeader from "./DayDateHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar · Waqt" };

export default async function DayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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

  const params = await searchParams;
  const date = params.date || today;

  return (
    <div className="overflow-x-hidden">
      {/* Date header is client-side so the cached shell works across days offline */}
      <DayDateHeader date={date} />
      <DayViewClient date={date} />
    </div>
  );
}
