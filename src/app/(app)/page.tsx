import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Sun, Sunrise, Sunset, Moon, CloudSun } from "lucide-react";

export const dynamic = "force-dynamic";

const PRAYER_ICONS = {
  Fajr: Sunrise,
  Dhuhr: Sun,
  Asr: CloudSun,
  Maghrib: Sunset,
  Isha: Moon,
} as const;

const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

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

  // Get user's timezone from prayer settings
  const [settings] = await db
    .select({ timezone: schema.prayerSettings.timezone })
    .from(schema.prayerSettings)
    .where(eq(schema.prayerSettings.userId, session.userId))
    .limit(1);

  const userTimezone = settings?.timezone || "UTC";

  // Get today's date in user's timezone
  const userNow = new Date(new Date().toLocaleString("en-US", { timeZone: userTimezone }));
  const today = userNow.toISOString().split("T")[0];

  // Fetch today's prayer times and prayer log in parallel
  const [cachedTimes, prayerLogs] = await Promise.all([
    db
      .select()
      .from(schema.prayerTimesCache)
      .where(
        and(
          eq(schema.prayerTimesCache.userId, session.userId),
          eq(schema.prayerTimesCache.date, today),
        ),
      )
      .limit(1),
    db
      .select()
      .from(schema.prayerLog)
      .where(
        and(
          eq(schema.prayerLog.userId, session.userId),
          eq(schema.prayerLog.date, today),
        ),
      ),
  ]);

  const prayerTimes = cachedTimes[0] || null;
  const logMap = new Map(prayerLogs.map((l) => [l.prayerName, l.status]));

  const prayers = PRAYER_ORDER.map((name) => {
    const key = name.toLowerCase() as "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
    const time = prayerTimes ? prayerTimes[key] : null;
    const status = logMap.get(key) || "pending";
    return {
      name,
      time: time || "—",
      icon: PRAYER_ICONS[name],
      status,
    };
  });

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10 lg:py-12">
      {/* ── Greeting ── */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {greeting(userNow.getHours())}
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
            {prayerTimes ? new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "Set location to see times"}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {prayers.map((prayer) => (
            <PrayerRow key={prayer.name} {...prayer} />
          ))}
        </div>
      </section>

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

      {/* ── Month view link ── */}
      <div className="mt-4">
        <a
          href="/calendar/month"
          className="flex items-center justify-between rounded-2xl border p-5 transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
              Month view
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Overview of the whole month
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

function greeting(hour: number): string {
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
  const isPrayed = status === "prayed";
  const isAssumed = status === "assumed_prayed";
  const isMissed = status === "missed";

  const statusLabel = isPrayed
    ? "Prayed"
    : isAssumed
      ? "Assumed prayed"
      : isMissed
        ? "Missed"
        : "Pending";

  const statusColor = isPrayed
    ? "var(--color-success)"
    : isMissed
      ? "var(--color-error)"
      : isAssumed
        ? "var(--color-ink-muted)"
        : "var(--color-ink-muted)";

  const statusBg = isPrayed
    ? "var(--color-accent-faint)"
    : "var(--color-paper-3)";

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
          <p className="text-xs tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
            {time}
          </p>
        </div>
      </div>

      <span
        className="rounded-full px-3 py-1 text-xs font-medium"
        style={{
          backgroundColor: statusBg,
          color: statusColor,
        }}
      >
        {statusLabel}
      </span>
    </div>
  );
}
