import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import DayViewClient from "./DayViewClient";

export const dynamic = "force-dynamic";

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

  // Calculate prev/next days using date strings (avoid timezone issues)
  const [y, m, d] = date.split("-").map(Number);
  const prevDate = new Date(y, m - 1, d - 1);
  const nextDate = new Date(y, m - 1, d + 1);
  const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(prevDate.getDate()).padStart(2, "0")}`;
  const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;

  // Format the date in the user's timezone
  const dateObj = new Date(y, m - 1, d);
  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: userTimezone,
  });

  return (
    <div>
      {/* Date header with day/month toggle */}
      <div className="border-b" style={{ borderColor: "var(--color-paper-3)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          {/* Prev day */}
          <Link
            href={`/calendar/day?date=${prevStr}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          {/* Date + view toggle */}
          <div className="flex flex-1 items-center justify-center gap-4">
            <div className="text-center">
              <h1 className="text-base font-semibold tracking-tight sm:text-lg" style={{ color: "var(--color-ink)" }}>
                {formattedDate}
              </h1>
              {date === today && (
                <p className="text-xs" style={{ color: "var(--color-accent)" }}>Today</p>
              )}
            </div>

            {/* Day/Month toggle — visible on all screen sizes */}
            <div
              className="flex rounded-lg border"
              style={{ borderColor: "var(--color-paper-3)" }}
            >
              <Link
                href={`/calendar/day?date=${date}`}
                className="rounded-l-lg px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
              >
                Day
              </Link>
              <Link
                href={`/calendar/month?year=${dateObj.getFullYear()}&month=${dateObj.getMonth() + 1}`}
                className="rounded-r-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ color: "var(--color-ink-soft)" }}
              >
                Month
              </Link>
            </div>
          </div>

          {/* Next day */}
          <Link
            href={`/calendar/day?date=${nextStr}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <DayViewClient date={date} />
    </div>
  );
}
