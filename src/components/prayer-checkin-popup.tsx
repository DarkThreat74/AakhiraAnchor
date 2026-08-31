"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, MapPin } from "lucide-react";
import { shouldShowMasjidQuestion, getPrayerWindowState, getPrayerWindowStart, type PrayerKey, type PrayerTimings } from "@/lib/prayer/checkin";
import { getSunnahsForFard, type SunnahDefinition } from "@/lib/prayer/sunnahs";
import { useUISFX } from "@/components/uisfx-provider";
import { clearApiCache } from "@/lib/sw-helpers";
import { hapticNotification, hapticImpact } from "@/lib/native-bridge";

interface PrayerCheckinPopup {
  prayer: PrayerKey;
  prayerLabel: string;
  date: string;
  timezone: string;
  madhab?: string;
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
  madhab = "standard",
  timings,
  onClose,
  onCheckedIn,
  existingStatus,
}: PrayerCheckinPopup) {
  const { play } = useUISFX();
  const [step, setStep] = useState<"main" | "masjid" | "sunnah">("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sunnahLogs, setSunnahLogs] = useState<Record<string, boolean>>({});
  const [sunnahLoading, setSunnahLoading] = useState<string | null>(null);

  // Get current time in user's timezone
  const now = new Date();
  const localStr = now.toLocaleString("en-US", { timeZone: timezone, hour12: false });
  const timeMatch = localStr.match(/(\d+):(\d+)/);
  const currentMinutes = timeMatch ? parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) : now.getHours() * 60 + now.getMinutes();

  const showMasjid = shouldShowMasjidQuestion(prayer, currentMinutes, timings);
  const windowState = getPrayerWindowState(prayer, currentMinutes, timings);
  const windowOpen = windowState === "open";
  const alreadyPrayed = existingStatus === "prayed";

  // Sunnah definitions for this prayer
  const sunnahDefs = getSunnahsForFard(prayer, madhab);

  // Format the start time for the "hasn't started yet" message
  let startTimeStr = "";
  if (windowState === "before") {
    const startMinutes = getPrayerWindowStart(prayer, timings);
    const startH = Math.floor(startMinutes / 60);
    const startM = startMinutes % 60;
    const period = startH >= 12 ? "PM" : "AM";
    const displayH = startH === 0 ? 12 : startH > 12 ? startH - 12 : startH;
    startTimeStr = `${displayH}:${String(startM).padStart(2, "0")} ${period}`;
  }

  // Fetch existing sunnah logs when popup opens
  useEffect(() => {
    if (sunnahDefs.length === 0) return;
    (async () => {
      try {
        const res = await fetch(`/api/prayer-log/sunnah?date=${date}`);
        if (res.ok) {
          const data = await res.json().catch(() => []);
          if (!Array.isArray(data)) return;
          const map: Record<string, boolean> = {};
          for (const log of data) {
            if (log.prayed) map[log.sunnahKey] = true;
          }
          setSunnahLogs(map);
        }
      } catch {
        // ignore
      }
    })();
  }, [date, sunnahDefs.length]);

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
        const data = await res.json().catch(() => ({}));
        clearApiCache();
        // If there are sunnahs for this prayer, show the sunnah step
        if (sunnahDefs.length > 0) {
          setStep("sunnah");
          setLoading(false);
        } else {
          play("check");
          void hapticNotification("success");
          onCheckedIn({ status: data.status, wentToMasjid: data.wentToMasjid });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to check in.");
        play("error");
        void hapticNotification("error");
        setLoading(false);
      }
    } catch {
      setError("Network error.");
      play("error");
      void hapticNotification("error");
      setLoading(false);
    }
  }

  async function handleToggleSunnah(sunnah: SunnahDefinition) {
    const isLogged = sunnahLogs[sunnah.key] === true;
    setSunnahLoading(sunnah.key);
    try {
      const res = await fetch("/api/prayer-log/sunnah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, sunnahKey: sunnah.key, prayed: !isLogged }),
      });
      if (res.ok) {
        clearApiCache();
        setSunnahLogs((prev) => ({ ...prev, [sunnah.key]: !isLogged }));
        void hapticImpact("light");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update sunnah.");
        setTimeout(() => setError(null), 4000);
      }
    } catch {
      setError("Network error.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setSunnahLoading(null);
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
      .then((res) => res.json().catch(() => ({})))
      .then(() => {
        clearApiCache();
        play("undo");
        void hapticImpact("light");
        onCheckedIn({ status: "pending", wentToMasjid: null });
      })
      .catch(() => {
        setError("Network error.");
        play("error");
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
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border p-5 shadow-xl"
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
            onClick={() => { play("close"); onClose(); }}
            className="min-h-11 min-w-11 rounded-lg p-2 transition-colors hover:bg-[var(--color-paper-2)]"
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
            {windowState === "before" ? (
              <>
                <p className="mb-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  {prayerLabel} hasn&apos;t started yet.
                </p>
                <p className="mb-4 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                  It begins at {startTimeStr}. Check back then, in sha&apos; Allah.
                </p>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm" style={{ color: "var(--color-ink-soft)" }}>
                  The {prayerLabel} window has ended.
                </p>
                <p className="mb-4 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                  You can still log it if you prayed but couldn&apos;t check in earlier.
                </p>
              </>
            )}
            <div className="flex gap-2">
              <button
                onClick={handlePrayedYes}
                disabled={loading}
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
                className="min-h-11 flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  borderColor: "var(--color-paper-3)",
                  color: "var(--color-ink-muted)",
                }}
              >
                Close
              </button>
            </div>
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
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
                className="min-h-11 flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
            {sunnahDefs.length > 0 && (
              <button
                onClick={() => setStep("sunnah")}
                className="mb-2 min-h-11 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors"
                style={{
                  borderColor: "var(--color-accent)",
                  color: "var(--color-accent)",
                }}
              >
                Log sunnah prayers
              </button>
            )}
            <button
              onClick={handleUndo}
              disabled={loading}
              className="min-h-11 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
                className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
                className="min-h-11 flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
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
              className="mt-2 min-h-11 w-full text-center text-xs font-medium transition-colors"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Back
            </button>
          </>
        )}

        {step === "sunnah" && (
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
                {prayerLabel} logged. Did you pray any sunnahs?
              </span>
            </div>

            <div className="mb-4 space-y-2">
              {sunnahDefs.map((sunnah) => {
                const isLogged = sunnahLogs[sunnah.key] === true;
                const isLoading = sunnahLoading === sunnah.key;
                return (
                  <button
                    key={sunnah.key}
                    onClick={() => handleToggleSunnah(sunnah)}
                    disabled={isLoading}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50"
                    style={{
                      borderColor: isLogged ? "var(--color-success)" : "var(--color-paper-3)",
                      backgroundColor: isLogged ? "color-mix(in oklab, var(--color-success) 8%, transparent)" : "transparent",
                    }}
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: isLogged ? "var(--color-success)" : "var(--color-paper-3)",
                        backgroundColor: isLogged ? "var(--color-success)" : "transparent",
                      }}
                    >
                      {isLogged && <Check className="h-3.5 w-3.5" style={{ color: "var(--color-paper)" }} />}
                      {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                        {sunnah.label}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                        {sunnah.position === "before" ? "Before fard" : sunnah.position === "after" ? "After fard" : "Standalone"}
                        {" · "}
                        {sunnah.category === "muakkadah" ? "Confirmed Sunnah" :
                         sunnah.category === "ghayr_muakkadah" ? "Non-confirmed" :
                         sunnah.category === "wajib" ? "Wajib" :
                         sunnah.category === "raghibah" ? "Raghibah" : "Recommended"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onCheckedIn({ status: "prayed", wentToMasjid: null })}
              className="min-h-11 w-full rounded-lg border py-2.5 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--color-paper-3)",
                color: "var(--color-ink-soft)",
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
