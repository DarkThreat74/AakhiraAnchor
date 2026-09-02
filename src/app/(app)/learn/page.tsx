import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import LearnClient from "./LearnClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learn · Waqt" };

export default async function LearnPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
    return;
  }

  // Fetch the user's madhab to pass to the client
  const [settings] = await db
    .select({ madhab: schema.prayerSettings.madhab })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  const madhab = (settings?.madhab === "hanafi" ? "hanafi" : "standard") as
    | "hanafi"
    | "standard";

  return <LearnClient madhab={madhab} />;
}
