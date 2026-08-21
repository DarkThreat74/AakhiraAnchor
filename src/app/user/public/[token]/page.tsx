import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import PublicCalendarClient from "./PublicCalendarClient";

export const dynamic = "force-dynamic";

// Generate metadata for the public calendar page
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    return { title: "Calendar not found — Waqt" };
  }

  return {
    title: "Shared calendar — Waqt",
    description: "A prayer-centered calendar shared publicly. Read-only view.",
  };
}

export default async function PublicCalendarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token || token.length < 16) {
    notFound();
  }

  // Verify the token exists
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    notFound();
  }

  return <PublicCalendarClient token={token} />;
}
