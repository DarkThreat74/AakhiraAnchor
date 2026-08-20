"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Heart, Bell, ArrowRight, Check, Loader2 } from "lucide-react";

type Step = "location" | "oath" | "notifications" | "done";

export default function OnboardingWizard() {
  const [step, setStep] = useState<Step>("location");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [timezone, setTimezone] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "getting" | "done">("idle");

  // Oath state
  const [oathAmount, setOathAmount] = useState(5);
  const [hasOath, setHasOath] = useState(false);

  // Notification state
  const [earlyMid, setEarlyMid] = useState("push");
  const [finalReminder, setFinalReminder] = useState("push");
  const [otherReminders, setOtherReminders] = useState("push");

  function handleGetLocation() {
    setLocationStatus("getting");
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocationStatus("idle");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setLocationStatus("done");
      },
      (err) => {
        setError(err.message || "Failed to get location.");
        setLocationStatus("idle");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function saveLocation() {
    if (lat === null || lng === null) return;
    setPending(true);
    setError(null);
    try {
      // Save prayer settings
      const res = await fetch("/api/onboarding/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat.toString(),
          longitude: lng.toString(),
          timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save location.");
        setPending(false);
        return;
      }

      // Trigger prayer times sync (non-blocking)
      fetch("/api/prayer-times/sync", { method: "POST" }).catch(() => {});

      setStep("oath");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function saveOath() {
    setPending(true);
    setError(null);
    try {
      if (hasOath) {
        await fetch("/api/onboarding/save-oath", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oathAmount }),
        });
      }
      setStep("notifications");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function saveNotifications() {
    setPending(true);
    setError(null);
    try {
      await fetch("/api/onboarding/save-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prayerEarlyMid: earlyMid,
          prayerFinal: finalReminder,
          otherReminders,
        }),
      });

      // Mark onboarding complete
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      setStep("done");
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  const steps: Step[] = ["location", "oath", "notifications", "done"];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-lg flex-col justify-center px-5 py-8 sm:px-6">
      {/* Progress dots */}
      {step !== "done" && (
        <div className="mb-10 flex items-center justify-center gap-2">
          {steps.slice(0, -1).map((s, i) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentIdx ? 24 : 6,
                backgroundColor: i <= currentIdx ? "var(--color-accent)" : "var(--color-paper-3)",
              }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="mb-6 text-center text-sm" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      {/* ── Step 1: Location ── */}
      {step === "location" && (
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "var(--color-accent-faint)" }}
          >
            <MapPin className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-ink)" }}>
            Set your location
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            We need your location to fetch accurate prayer times from AlAdhan.
            Your coordinates are stored in your account and never shared.
          </p>

          <div className="mt-8 w-full max-w-sm">
            {locationStatus === "idle" && (
              <button
                onClick={handleGetLocation}
                className="w-full rounded-full px-6 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
              >
                Get my location
              </button>
            )}

            {locationStatus === "getting" && (
              <div className="flex items-center justify-center gap-2 text-sm" style={{ color: "var(--color-ink-muted)" }}>
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting location...
              </div>
            )}

            {locationStatus === "done" && lat !== null && lng !== null && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: "var(--color-success)", backgroundColor: "var(--color-accent-faint)", color: "var(--color-ink)" }}
                >
                  <Check className="h-4 w-4" style={{ color: "var(--color-success)" }} />
                  Location captured: {lat.toFixed(2)}, {lng.toFixed(2)}
                </div>
                <button
                  onClick={saveLocation}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
                >
                  {pending ? "Saving..." : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep("oath")}
            className="mt-6 text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "var(--color-ink-muted)" }}
          >
            Skip for now
          </button>
        </div>
      )}

      {/* ── Step 2: Oath ── */}
      {step === "oath" && (
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "var(--color-accent-faint)" }}
          >
            <Heart className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-ink)" }}>
            Oath amount
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Choose how much you owe per missed prayer. This is a personal
            commitment — the app tracks it, it doesn&apos;t collect it. You can
            change this later.
          </p>

          <div className="mt-8 w-full max-w-sm">
            <label className="flex items-center gap-3 text-left">
              <input
                type="checkbox"
                checked={hasOath}
                onChange={(e) => setHasOath(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                I want to track an oath
              </span>
            </label>

            {hasOath && (
              <div className="mt-6">
                <label className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
                  Amount per missed prayer ($)
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={oathAmount}
                  onChange={(e) => setOathAmount(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>
                  ${oathAmount}
                </p>
              </div>
            )}

            <button
              onClick={saveOath}
              disabled={pending}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              {pending ? "Saving..." : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Notifications ── */}
      {step === "notifications" && (
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "var(--color-accent-faint)" }}
          >
            <Bell className="h-7 w-7" style={{ color: "var(--color-accent)" }} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--color-ink)" }}>
            Notification preferences
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Three independent settings. SMS is opt-in only and disabled by default.
          </p>

          <div className="mt-8 w-full max-w-sm space-y-4">
            <NotificationSelect
              label="Early & mid reminders"
              value={earlyMid}
              onChange={setEarlyMid}
            />
            <NotificationSelect
              label="Final escalation"
              value={finalReminder}
              onChange={setFinalReminder}
            />
            <NotificationSelect
              label="Other reminders"
              value={otherReminders}
              onChange={setOtherReminders}
              allowSms={false}
            />

            <button
              onClick={saveNotifications}
              disabled={pending}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              {pending ? "Saving..." : "Complete setup"}
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-accent-faint)" }}
          >
            <Check className="h-10 w-10" style={{ color: "var(--color-success)" }} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            You&apos;re all set
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            Your account is ready. Prayer times are being fetched for your
            location. Open the calendar to see your day with prayer bands.
          </p>
          <button
            onClick={() => router.push("/calendar/day")}
            className="mt-8 inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
          >
            Open calendar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationSelect({
  label,
  value,
  onChange,
  allowSms = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowSms?: boolean;
}) {
  const options = allowSms
    ? [
        { value: "push", label: "Push only" },
        { value: "push_sms", label: "Push + SMS" },
        { value: "sms", label: "SMS only" },
      ]
    : [
        { value: "push", label: "Push" },
        { value: "none", label: "Off" },
      ];

  return (
    <div className="text-left">
      <label className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
