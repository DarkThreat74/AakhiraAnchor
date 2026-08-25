import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { slugifyName } from "@/lib/slugify";

export const dynamic = "force-dynamic";

// Legacy route — redirects to /user/[name]/[token]
export default async function LegacyPublicCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Token is a 32-character hex string (128-bit crypto-random)
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    notFound();
  }

  // Look up the user by token to get their display name for the redirect
  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    notFound();
  }

  // Redirect to the new named URL
  const slug = slugifyName(user.displayName || "shared");
  redirect(`/user/${slug}/${token}`);
}
