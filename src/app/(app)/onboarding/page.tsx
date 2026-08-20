"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Heart, Bell, BookOpen, ArrowRight, Check } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const steps = [
    {
      icon: MapPin,
      title: "Welcome to Waqt",
      body: "Waqt treats the five daily prayers as the fixed structure of your day. Everything else — your calendar, your tasks, your reminders — fits around them. Let's set up a few things to get you started.",
      action: "Begin setup",
    },
    {
      icon: BookOpen,
      title: "How prayer tracking works",
      body: "Each prayer has a window from its time until the next prayer. You can check in at any point during that window. If you forget to mark a prayer, it resolves quietly as assumed prayed at the end of the day — no penalty, no shame.",
      action: "Continue",
    },
    {
      icon: Heart,
      title: "Accountability, not punishment",
      body: "Waqt offers an optional oath ledger and qadaa tracker. These live on a dedicated page — one deliberate tap away from your home screen. The app is a witness, not a collector. You can set these up later or skip them entirely.",
      action: "Continue",
    },
    {
      icon: Bell,
      title: "You're ready",
      body: "Your account is set up. The full onboarding wizard — location capture for prayer times, oath amount, notification preferences, and religiosity quiz — will be available soon. For now, explore the dashboard and come back to complete setup later.",
      action: "Go to dashboard",
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  async function handleNext() {
    if (isLast) {
      // Mark onboarding as complete and go to dashboard
      setPending(true);
      try {
        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok || res.status === 404) {
          // Even if the endpoint doesn't exist yet, proceed
          router.push("/");
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-lg flex-col justify-center px-5 py-8 sm:px-6">
      {/* Progress dots */}
      <div className="mb-10 flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 6,
              backgroundColor: i <= step ? "var(--color-accent)" : "var(--color-paper-3)",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="flex flex-col items-center text-center">
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--color-accent-faint)" }}
        >
          <current.icon className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-ink)" }}>
          {current.title}
        </h1>

        <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {current.body}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-col items-center gap-4">
        <button
          onClick={handleNext}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
        >
          {pending ? "Saving..." : current.action}
          {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>

        {!isLast && (
          <button
            onClick={() => router.push("/")}
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
