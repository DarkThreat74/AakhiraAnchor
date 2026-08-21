/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
 * Macrostructure: full-bleed hero with Arabic calligraphy background →
 *   principle band → Arabic quote → letter close → footer
 * Spectral for editorial Latin text, Amiri for Arabic.
 * Warm contemplative palette. No gradients. No AI-slop patterns.
 *
 * Animation: scroll-triggered fade-ins, staggered reveals, blur-in for
 * Arabic background text, scale-in for focal elements.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FadeIn, StaggerGroup, StaggerItem, ScaleIn } from "@/components/animations";
import UnregisterServiceWorker from "@/components/sw-unregister";
import { getSession } from "@/lib/auth/session";

export default async function MarketingPage() {
  // If already logged in, skip the marketing page and go straight to the calendar
  const session = await getSession();
  if (session) redirect("/calendar/day");

  return (
    <div className="flex min-h-screen flex-col" style={{ fontFamily: "var(--font-spectral), Georgia, serif" }}>
      <UnregisterServiceWorker />
      {/* ── Nav ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: "color-mix(in oklab, var(--color-paper) 85%, transparent)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 sm:px-10 lg:px-16">
          <div className="flex items-baseline gap-3">
            <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
              Waqt
            </span>
            <span className="text-sm" style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-amiri)" }} dir="rtl">
              وقت
            </span>
          </div>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/login"
              className="transition-opacity hover:opacity-60"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero — full viewport, Arabic calligraphy background ── */}
      <section
        className="relative flex min-h-screen items-center overflow-hidden pt-20"
        style={{
          backgroundColor: "color-mix(in oklab, var(--color-paper) 70%, var(--color-accent-faint))",
        }}
      >
        {/* Arabic background text — "حي على الصلاة" (Come to prayer) as a watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
          style={{ overflow: "hidden" }}
        >
          <div
            className="select-none whitespace-nowrap text-center"
            style={{
              fontFamily: "var(--font-amiri)",
              fontSize: "clamp(8rem, 22vw, 22rem)",
              color: "var(--color-accent)",
              opacity: 0.12,
              lineHeight: 1,
              transform: "rotate(-5deg)",
            }}
            dir="rtl"
          >
            حي على الصلاة
          </div>
        </div>

        {/* Secondary Arabic — smaller, positioned top-right */}
        <div
          className="absolute right-6 top-32 hidden sm:block lg:right-16"
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "var(--font-amiri)",
              fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
              color: "var(--color-warmth)",
              opacity: 0.22,
            }}
            dir="rtl"
          >
            إن الصلاة كانت على المؤمنين كتاباً موقوتاً
          </span>
        </div>

        {/* Tertiary Arabic — bottom-left, very faint */}
        <div
          className="absolute bottom-24 left-6 hidden sm:block lg:left-16"
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: "var(--font-amiri)",
              fontSize: "clamp(1.2rem, 2.5vw, 2rem)",
              color: "var(--color-accent)",
              opacity: 0.15,
            }}
            dir="rtl"
          >
            الوقتُ كالسيف
          </span>
        </div>

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16">
          <div className="max-w-2xl">
            <FadeIn delay={0.05} y={12} duration={0.35}>
              <p
                className="mb-8 text-xs font-medium uppercase tracking-[0.2em]"
                style={{ color: "var(--color-accent)" }}
              >
                Prayer-centered life tracker
              </p>
            </FadeIn>

            <StaggerGroup stagger={0.08}>
              <StaggerItem>
                <h1
                  className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
                  style={{
                    color: "var(--color-ink)",
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
                >
                  The five prayers
                  <br />
                  are the fixed
                  <br />
                  anchor.
                </h1>
              </StaggerItem>
            </StaggerGroup>

            <FadeIn delay={0.2} y={16} duration={0.4}>
              <p
                className="mt-10 max-w-lg text-lg leading-relaxed"
                style={{ color: "var(--color-ink-soft)" }}
              >
                Everything else fits around them. A calendar that treats
                prayer times as the structure of your day — not a reminder
                you dismiss.
              </p>
            </FadeIn>

            <FadeIn delay={0.3} y={16} duration={0.4}>
              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: "var(--color-ink)",
                    color: "var(--color-paper)",
                  }}
                >
                  Start tracking
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="text-base font-medium underline underline-offset-4 transition-opacity hover:opacity-60"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  I have an account
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Scroll indicator — animated bounce */}
        <FadeIn delay={0.5} duration={0.4}>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div
              className="h-12 w-px"
              style={{
                backgroundColor: "var(--color-ink-muted)",
                opacity: 0.3,
                animation: "waqt-scroll-pulse 2s ease-in-out infinite",
              }}
            />
          </div>
        </FadeIn>
      </section>

      {/* ── Principle band — full width, three principles as numbered prose ── */}
      <section
        className="border-y px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: "var(--color-paper-2)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <FadeIn y={20}>
            <div className="mb-16 flex items-center gap-4">
              <p
                className="text-xs font-medium uppercase tracking-[0.2em]"
                style={{ color: "var(--color-ink-muted)" }}
              >
                How it works
              </p>
              <span
                style={{
                  fontFamily: "var(--font-amiri)",
                  fontSize: "1.5rem",
                  color: "var(--color-accent)",
                  opacity: 0.5,
                }}
                dir="rtl"
              >
                كيف يعمل
              </span>
            </div>
          </FadeIn>

          <StaggerGroup className="grid gap-16 lg:grid-cols-3 lg:gap-12" stagger={0.18}>
            <StaggerItem>
              <Principle
                num="01"
                title="Prayer times become the grid"
                body="Your day view shows the five prayer windows as background bands. Scheduled events sit on top. Overlaps are permissive — nothing blocks, nothing warns."
              />
            </StaggerItem>
            <StaggerItem>
              <Principle
                num="02"
                title="Check in, or let it rest"
                body="Mark a prayer as prayed when you're ready. If you forget, it resolves quietly as assumed prayed at day's end. No silent penalties, no shame spiral."
              />
            </StaggerItem>
            <StaggerItem>
              <Principle
                num="03"
                title="Accountability, not punishment"
                body="Track an oath ledger and a qadaa backlog on a dedicated page — one deliberate tap away, never on your home screen. The app is a witness, not a collector."
              />
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      {/* ── Quote band — full width, Arabic + translation ── */}
      <section className="px-6 py-24 sm:px-10 sm:py-32 lg:px-16">
        <div className="mx-auto max-w-4xl text-center">
          <ScaleIn delay={0.05} duration={0.4}>
            <p
              className="mb-8 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl"
              style={{ color: "var(--color-ink)", fontFamily: "var(--font-amiri)" }}
              dir="rtl"
            >
              حي على الصلاة
            </p>
          </ScaleIn>
          <FadeIn delay={0.15} y={12} duration={0.35}>
            <p
              className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
              style={{ color: "var(--color-ink-soft)" }}
            >
              &ldquo;Come to prayer.&rdquo;
            </p>
          </FadeIn>
          <FadeIn delay={0.25} y={8} duration={0.3}>
            <p className="mt-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              — The call to prayer, heard five times daily
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Second quote — about prayer being timed ── */}
      <section
        className="border-y px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: "var(--color-paper-2)",
        }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <ScaleIn delay={0.05} duration={0.4}>
            <p
              className="mb-6 text-3xl leading-relaxed sm:text-4xl"
              style={{ color: "var(--color-ink)", fontFamily: "var(--font-amiri)" }}
              dir="rtl"
            >
              إن الصلاة كانت على المؤمنين كتاباً موقوتاً
            </p>
          </ScaleIn>
          <FadeIn delay={0.15} y={12} duration={0.35}>
            <p
              className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl"
              style={{ color: "var(--color-ink-soft)" }}
            >
              &ldquo;Prayer has been prescribed for the believers at fixed times.&rdquo;
            </p>
          </FadeIn>
          <FadeIn delay={0.25} y={8} duration={0.3}>
            <p className="mt-6 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              — Quran, An-Nisa 4:103
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Letter close — quiet ending ── */}
      <section
        className="border-t px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
        style={{ borderColor: "var(--color-paper-3)" }}
      >
        <div className="mx-auto max-w-2xl">
          <FadeIn y={20} duration={0.4}>
            <p
              className="text-xl leading-relaxed"
              style={{ color: "var(--color-ink-soft)" }}
            >
              Waqt is being built carefully, one piece at a time. If you want to
              be part of the first group of users, create an account — you&apos;ll
              get the calendar and prayer tracking first, with more arriving in
              steady updates.
            </p>
          </FadeIn>
          <FadeIn delay={0.1} y={16} duration={0.35}>
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-base font-medium underline underline-offset-4"
                style={{ color: "var(--color-accent)" }}
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t px-6 py-8 text-xs sm:px-10 lg:px-16"
        style={{
          borderColor: "var(--color-paper-3)",
          color: "var(--color-ink-muted)",
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span>Waqt — a prayer-centered life tracker.</span>
            <span style={{ fontFamily: "var(--font-amiri)", opacity: 0.6 }} dir="rtl">
              وقت
            </span>
          </div>
          <Link
            href="/admin/login"
            className="transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Principle({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4">
      <span
        className="text-sm font-mono font-medium tabular-nums"
        style={{ color: "var(--color-accent)" }}
      >
        {num}
      </span>
      <h2
        className="text-xl font-semibold tracking-tight"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      <p
        className="text-base leading-relaxed"
        style={{ color: "var(--color-ink-soft)" }}
      >
        {body}
      </p>
    </div>
  );
}
