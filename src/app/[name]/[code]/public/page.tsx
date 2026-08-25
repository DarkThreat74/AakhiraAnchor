import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import PublicCalendarClient from "@/app/user/public/[token]/PublicCalendarClient";
import { slugifyName } from "@/lib/slugify";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Generate metadata for the public calendar page — shows in link previews
// as "Umar's calendar" with the Waqt icon.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; code: string }>;
}): Promise<Metadata> {
  const { code } = await params;

  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, code))
    .limit(1);

  if (!user) {
    return { title: "Calendar not found — Waqt" };
  }

  const name = user.displayName || "Shared";
  const title = `${name}'s calendar — Waqt`;
  const description = `${name}'s prayer-centered calendar. Read-only shared view.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Waqt",
      type: "website",
      images: [
        {
          url: "/icon.svg",
          width: 512,
          height: 512,
          alt: "Waqt",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/icon.svg"],
    },
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function PublicCalendarPage({
  params,
}: {
  params: Promise<{ name: string; code: string }>;
}) {
  const { name, code } = await params;

  // Code is a 5-digit numeric string
  if (!code || !/^\d{5}$/.test(code)) {
    notFound();
  }

  // Verify the code exists and get the display name
  const [user] = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName })
    .from(schema.users)
    .where(eq(schema.users.publicShareToken, code))
    .limit(1);

  if (!user) {
    notFound();
  }

  // If the name in the URL doesn't match the user's slugified name,
  // redirect to the correct URL (handles old links or name changes)
  const expectedSlug = slugifyName(user.displayName || "shared");
  if (name !== expectedSlug) {
    redirect(`/${expectedSlug}/${code}/public`);
  }

  return <PublicCalendarClient token={code} displayName={user.displayName || "Shared"} />;
}
