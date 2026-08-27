import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import GoalsClient from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const goals = await db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, session.userId))
    .orderBy(schema.goals.sortOrder, schema.goals.createdAt);

  return <GoalsClient initialGoals={goals} />;
}
