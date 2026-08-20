import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import MonthViewClient from "./MonthViewClient";

export const dynamic = "force-dynamic";

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Gate: redirect to onboarding if not completed
  const [user] = await db
    .select({ onboardingCompleted: schema.users.onboardingCompleted })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (user && !user.onboardingCompleted) redirect("/onboarding");

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;

  return <MonthViewClient year={year} month={month} />;
}
