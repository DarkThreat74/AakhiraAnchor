"use client";

import { useState } from "react";
import { Check, X, Loader2, MapPin } from "lucide-react";
import { shouldShowMasjidQuestion, isPrayerWindowOpen, type PrayerKey, type PrayerTimings } from "@/lib/prayer/checkin";

interface PrayerCheckinPopup {
  prayer: PrayerKey;
  prayerLabel: string;
  date: string;
  timezone: string;
  timings: PrayerTimings;
  onClose: () => void;
  onCheckedIn: (result: { status: string; wentToMasjid: boolean | null }) => void;
  existingStatus?: string;
}

export default function PrayerCheckinPopup({
  prayer,
  prayerLabel,
  date,
  timezone,
  timings,
  onClose,
  onCheckedIn,
  existingStatus,
}: PrayerCheckinPopup) {
  const [step, setStep] = useState<"main" | "masjid">("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current time in user's timezone
  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: timezone, hour12: false });
  const timeMatch = localStr.match(/(\d+):(\d+)/);
  const currentMinutes = timeMatch ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) : now.getHours() * 60 + now.getMinutes();

  const showMasjid = shouldShowMasjidQuestion(prayer, currentMinutes, timings);
  const windowOpen = isPrayerWindowOpen(prayer, currentMinutes, timings);
  const alreadyPrayed = existingStatus === "prayed";

  async function checkIn(wentToMasjid: boolean | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prayer-log/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          prayerName: prayer,
          status: "prayed",
          wentToMasjid: wentToMasjid,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCheckedIn({ status: data.status, wentToMasjid: data.wentToMasjid });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to check in.");
        setLoading(false);
      }
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  function handlePrayedYes() {
    if (showMasjid) {
      setStep("masjid");
    } else {
      checkIn(null);
    }
  }

  function handleUndo() {
    setLoading(true);
    setError(null);
    fetch("/api/prayer-log/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        prayerName: prayer,
        status: "pending",
        wentToMasjid: false,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        onCheckedIn({ status: "pending", wentToMasjid: null });
      })
      .catch(() => {
        setError("Network error.");
        setLoading(false);
      });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 50%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-5 shadow-xl"
        style={{
          backgroundColor: "var(--color-paper)",
          borderColor: "var(--color-paper-3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-ink)" }}>
            {prayerLabel}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-muted)" }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div
            className="mb-3 rounded-lg border p-2.5 text-xs"
            style={{
              borderColor: "var(--color-warmth)",
              backgroundColor: "color-mix(in oklab, var(--color-warmth) 10%, transparent)",
              color: "var(--color-warmth)",
            }}
          >
            {error}
          </div>
        )}

        {step === "main" && !alreadyPrayed && !windowOpen && (
          <div className="text-center">
            <p className="mb-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              The {prayerLabel} window has ended.
            </p>
            <p className="mb-4 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              You can no longer log this prayer. In sha&apos; Allah, catch the next one on time.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border py-2.5 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
            >
              Close
            </button>
          </div>
        )}

        {step === "main" && !alreadyPrayed && windowOpen && (
          <>
            <p className="mb-4 text-sm" style={{ color: "var(--color-ink-soft)" }}>
              Did you pray {prayerLabel}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePrayedYes}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--color-success)",
                  backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)",
                  color: "var(--color-success)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Yes, I prayed
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--color-paper-3)",
                  color: "var(--color-ink-muted)",
                }}
              >
                Not yet
              </button>
            </div>
          </>
        )}

        {step === "main" && alreadyPrayed && (
          <>
            <div
              className="mb-4 flex items-center gap-2 rounded-lg border p-3"
              style={{
                borderColor: "var(--color-success)",
                backgroundColor: "color-mix(in oklab, var(--color-success) 10%, transparent)",
              }}
            >
              <Check className="h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--color-success)" }}>
                You prayed {prayerLabel}. In sha&apos; Allah.
              </span>
            </div>
            <button
              onClick={handleUndo}
              disabled={loading}
              className="w-full rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                borderColor: "var(--color-paper-3)",
                color: "var(--color-ink-muted)",
              }}
            >
              {loading ? "Undoing..." : "Undo"}
            </button>
          </>
        )}

        {step === "masjid" && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Did you pray in the masjid?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => checkIn(true)}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--color-accent)",
                  backgroundColor: "color-mix(in oklab, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Yes, at the masjid
              </button>
              <button
                onClick={() => checkIn(false)}
                disabled={loading}
                className="flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--color-paper-3)",
                  color: "var(--color-ink-soft)",
                }}
              >
                Prayed at home
              </button>
            </div>
            <button
              onClick={() => setStep("main")}
              disabled={loading}
              className="mt-2 w-full text-center text-xs font-medium transition-colors"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
