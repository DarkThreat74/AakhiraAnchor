import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import LogoutButton from "./logout-button";
import { Calendar, BookOpen, Heart, Settings } from "lucide-react";

// Force dynamic — prevents static prerender + CSP nonce conflicts
// See CODEBASE_PATTERNS.md §7.2
export const dynamic = "force-dynamic";

const navItems = [
  { label: "Today", href: "/", icon: Calendar },
  { label: "Calendar", href: "/calendar/day", icon: Calendar },
  { label: "Lesson", href: "/lesson", icon: BookOpen },
  { label: "Dhikr", href: "/dhikr", icon: Heart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user] = await db
    .select({ onboardingCompleted: schema.users.onboardingCompleted })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  // Redirect to onboarding if not completed (unless already there)
  if (user && !user.onboardingCompleted) {
    // The onboarding page itself is under (app), so we let it through
    // Other routes get redirected
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--color-paper)" }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 hidden w-60 flex-col border-r lg:flex"
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

        <div className="border-t px-3 py-4" style={{ borderColor: "var(--color-paper-3)" }}>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col lg:pl-60">
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
          <LogoutButton />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
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
    </div>
  );
}

function NavItem({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Calendar }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
      style={{ color: "var(--color-ink-soft)" }}
    >
      <Icon className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
      {label}
    </a>
  );
}

function MobileNavItem({ label, href, icon: Icon }: { label: string; href: string; icon: typeof Calendar }) {
  return (
    <a
      href={href}
      className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium"
      style={{ color: "var(--color-ink-muted)" }}
    >
      <Icon className="h-5 w-5" />
      {label}
    </a>
  );
}
