import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DayViewClient from "./DayViewClient";

export const dynamic = "force-dynamic";

export default async function DayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const date = params.date || today;

  // Calculate prev/next days
  const dateObj = new Date(date + "T00:00:00");
  const prevDate = new Date(dateObj);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(dateObj);
  nextDate.setDate(nextDate.getDate() + 1);

  const prevStr = prevDate.toISOString().split("T")[0];
  const nextStr = nextDate.toISOString().split("T")[0];

  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div>
      {/* Date header */}
      <div className="border-b" style={{ borderColor: "var(--color-paper-3)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href={`/calendar/day?date=${prevStr}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
              {formattedDate}
            </h1>
            {date === today && (
              <p className="text-xs" style={{ color: "var(--color-accent)" }}>Today</p>
            )}
          </div>
          <Link
            href={`/calendar/day?date=${nextStr}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-paper-2)]"
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
