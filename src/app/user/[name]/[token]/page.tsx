import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import PublicCalendarClient from "@/app/user/public/[token]/PublicCalendarClient";
import { slugifyName } from "@/lib/slugify";

export const dynamic = "force-dynamic";

// Generate metadata for the public calendar page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; token: string }>;
}) {
  const { token } = await params;

  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    return { title: "Calendar not found — Waqt" };
  }

  const name = user.displayName || "Shared";
  return {
    title: `${name}'s calendar — Waqt`,
    description: `${name}'s prayer-centered calendar. Read-only shared view.`,
  };
}

export default async function NamedPublicCalendarPage({
  params,
}: {
  params: Promise<{ name: string; token: string }>;
}) {
  const { name, token } = await params;

  // 5-digit numeric token
  if (!token || !/^\d{5}$/.test(token)) {
    notFound();
  }

  // Verify the token exists and get the display name
  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    notFound();
  }

  // If the name in the URL doesn't match the user's slugified name,
  // redirect to the correct URL (handles old links or name changes)
  const expectedSlug = slugifyName(user.displayName || "shared");
  if (name !== expectedSlug) {
    redirect(`/user/${expectedSlug}/${token}`);
  }

  return <PublicCalendarClient token={token} displayName={user.displayName || "Shared"} />;
}
