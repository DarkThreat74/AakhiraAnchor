import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { Calendar, Settings, Flame } from "lucide-react";
import ServiceWorkerRegister from "@/components/sw-register";
import NotificationScheduler from "@/components/notification-scheduler";

// Force dynamic — prevents static prerender + CSP nonce conflicts
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Check if the user has set their display name and madhab — if not, show a red dot on Settings
  // Wrap in try-catch so a DB failure doesn't crash the entire layout
  let needsSettings = false;
  try {
    const [user] = await db
      .select({ displayName: schema.users.displayName })
      .from(schema.users)
      .where(eq(schema.users.id, session.userId))
      .limit(1);
    needsSettings = !user?.displayName;

    // Also check if madhab is set in prayer settings
    if (!needsSettings) {
      const [settings] = await db
        .select({ madhab: schema.prayerSettings.madhab })
        .from(schema.prayerSettings)
        .where(eq(schema.prayerSettings.userId, session.userId))
        .limit(1);
      // Show dot if no settings row at all, or if madhab is null/empty
      if (!settings || !settings.madhab) needsSettings = true;
    }
  } catch {
    // If the query fails, don't show the dot — better to render the app than crash
    needsSettings = false;
  }

  const navItems = [
    { label: "Calendar", href: "/calendar/day", icon: Calendar, alert: false },
    { label: "Prayer", href: "/prayer", icon: Flame, alert: false },
    { label: "Settings", href: "/settings", icon: Settings, alert: needsSettings },
  ];

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-paper)" }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 hidden w-56 flex-col border-r lg:flex"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <div className="flex items-center px-6 py-6">
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            Waqt
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col lg:pl-56">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between border-b px-5 py-3 lg:hidden backdrop-blur-md"
          style={{
            borderColor: "var(--color-paper-3)",
            backgroundColor: "color-mix(in oklab, var(--color-paper) 90%, transparent)",
          }}
        >
          <span className="text-base font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            Waqt
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t lg:hidden backdrop-blur-md"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: "color-mix(in oklab, var(--color-paper) 90%, transparent)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {navItems.map((item) => (
          <MobileNavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Service worker + notification scheduler */}
      <ServiceWorkerRegister />
      <NotificationScheduler />
    </div>
  );
}

function NavItem({ label, href, icon: Icon, alert }: { label: string; href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; alert?: boolean }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
      style={{ color: "var(--color-ink-soft)" }}
    >
      <span className="relative">
        <Icon className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
        {alert && (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: "#dc2626" }}
            aria-label="Action needed"
          />
        )}
      </span>
      {label}
    </Link>
  );
}

function MobileNavItem({ label, href, icon: Icon, alert }: { label: string; href: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; alert?: boolean }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
      style={{ color: "var(--color-ink-muted)" }}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {alert && (
          <span
            className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: "#dc2626" }}
            aria-label="Action needed"
          />
        )}
      </span>
      {label}
    </Link>
  );
}
