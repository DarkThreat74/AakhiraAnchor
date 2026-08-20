import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Sun, Sunrise, Sunset, Moon, CloudSun } from "lucide-react";

export const dynamic = "force-dynamic";

const prayers = [
  { name: "Fajr", time: "—", icon: Sunrise, status: "pending" },
  { name: "Dhuhr", time: "—", icon: Sun, status: "pending" },
  { name: "Asr", time: "—", icon: CloudSun, status: "pending" },
  { name: "Maghrib", time: "—", icon: Sunset, status: "pending" },
  { name: "Isha", time: "—", icon: Moon, status: "pending" },
];

export default async function AppHome() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Gate: redirect to onboarding if not completed
  const [user] = await db
    .select({ onboardingCompleted: schema.users.onboardingCompleted })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  if (user && !user.onboardingCompleted) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10 lg:py-12">
      {/* ── Greeting ── */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {greeting()}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-ink)" }}>
          {session?.email?.split("@")[0] ?? "Friend"}
        </h1>
      </div>

      {/* ── Prayer status card ── */}
      <section
        className="rounded-2xl border p-5 sm:p-6"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: "var(--color-paper-2)",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Today&apos;s Prayers
          </h2>
          <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Set location to see times
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {prayers.map((prayer) => (
            <PrayerRow key={prayer.name} {...prayer} />
          ))}
        </div>
      </section>

      {/* ── Coming next ── */}
      <section className="mt-6 rounded-2xl border p-5 sm:p-6" style={{ borderColor: "var(--color-paper-3)" }}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
          What&apos;s coming
        </h2>
        <div className="flex flex-col gap-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          <ComingItem text="Calendar with prayer-time bands as the grid" />
          <ComingItem text="Tap-to-add events with side-by-side overlap stacking" />
          <ComingItem text="Prayer check-in state machine with reminders" />
          <ComingItem text="Oath ledger and qadaa tracking" />
          <ComingItem text="Daily lessons, dhikr counter, and talks library" />
        </div>
      </section>

      {/* ── Onboarding prompt ── */}
      <div className="mt-6">
        <a
          href="/onboarding"
          className="flex items-center justify-between rounded-2xl border p-5 transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ borderColor: "var(--color-accent)", backgroundColor: "var(--color-accent-faint)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Complete onboarding
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Set your location, oath amount, and preferences
            </p>
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            Start →
          </span>
        </a>
      </div>

      {/* ── Calendar link ── */}
      <div className="mt-4">
        <a
          href="/calendar/day"
          className="flex items-center justify-between rounded-2xl border p-5 transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Open calendar
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Day view with prayer bands and event scheduling
            </p>
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            →
          </span>
        </a>
      </div>
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "The night is quiet";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 20) return "Good evening";
  return "The night is quiet";
}

function PrayerRow({
  name,
  time,
  icon: Icon,
  status,
}: {
  name: string;
  time: string;
  icon: typeof Sun;
  status: string;
}) {
  const isPending = status === "pending";

  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ backgroundColor: "var(--color-paper)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--color-paper-3)" }}
        >
          <Icon className="h-4 w-4" style={{ color: "var(--color-ink-soft)" }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
            {name}
          </p>
          <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
            {time}
          </p>
        </div>
      </div>

      <span
        className="rounded-full px-3 py-1 text-xs font-medium"
        style={{
          backgroundColor: isPending ? "var(--color-paper-3)" : "var(--color-accent-faint)",
          color: isPending ? "var(--color-ink-muted)" : "var(--color-accent)",
        }}
      >
        {isPending ? "Pending" : "Prayed"}
      </span>
    </div>
  );
}

function ComingItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: "var(--color-accent)" }}
      />
      {text}
    </div>
  );
}
