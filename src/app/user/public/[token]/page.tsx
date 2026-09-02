import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { slugifyName } from "@/lib/slugify";

export const dynamic = "force-dynamic";

// Legacy route — redirects to /[name]/[code]/public
export default async function LegacyPublicCalendarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Token is a 128-bit hex string (32 chars). Legacy 5-digit codes are no
  // longer accepted — they were enumerable and allowed IDOR access.
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    notFound();
  }

  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, token))
    .limit(1);

  if (!user) {
    notFound();
  }

  const slug = slugifyName(user.displayName || "shared");
  redirect(`/${slug}/${token}/public`);
}
