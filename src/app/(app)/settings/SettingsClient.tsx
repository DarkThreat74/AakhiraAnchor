"use client";

import { useState } from "react";
import { MapPin, Bell, RefreshCw, Check, AlertCircle } from "lucide-react";

interface PrayerSettings {
  latitude: string;
  longitude: string;
  timezone: string;
  calculationMethod: number;
  madhab: string | null;
}

interface NotificationPrefs {
  prayerEarlyMid: string;
  prayerFinal: string;
  otherReminders: string;
}

export default function SettingsClient({
  prayerSettings,
  notificationPrefs,
}: {
  prayerSettings: PrayerSettings | null;
  notificationPrefs: NotificationPrefs | null;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifResult, setNotifResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(
    notificationPrefs || {
      prayerEarlyMid: "push",
      prayerFinal: "push",
      otherReminders: "push",
    },
  );

  async function handleSyncPrayerTimes() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/prayer-times/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ ok: true, message: `Synced ${data.daysCached} days of prayer times.` });
      } else {
        setSyncResult({ ok: false, message: data.error || "Sync failed." });
      }
    } catch {
      setSyncResult({ ok: false, message: "Network error." });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveNotifs() {
    setSavingNotif(true);
    setNotifResult(null);
    try {
      const res = await fetch("/api/onboarding/save-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifPrefs),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifResult({ ok: true, message: "Notification preferences saved." });
      } else {
        setNotifResult({ ok: false, message: data.error || "Save failed." });
      }
    } catch {
      setNotifResult({ ok: false, message: "Network error." });
    } finally {
      setSavingNotif(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
        Settings
      </h1>

      {/* ── Prayer Settings ── */}
      <section
        className="mb-6 rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Prayer Location
          </h2>
        </div>

        {prayerSettings ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Coordinates</span>
              <span className="text-sm tabular-nums" style={{ color: "var(--color-ink)" }}>
                {prayerSettings.latitude}, {prayerSettings.longitude}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Timezone</span>
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                {prayerSettings.timezone}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Calculation Method</span>
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                {METHOD_LABELS[prayerSettings.calculationMethod] || `Method ${prayerSettings.calculationMethod}`}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Madhab</span>
              <span className="text-sm" style={{ color: "var(--color-ink)" }}>
                {prayerSettings.madhab === "hanafi" ? "Hanafi" : "Standard (Shafi'i)"}
              </span>
            </div>

            {/* Sync button */}
            <div className="mt-3">
              <button
                onClick={handleSyncPrayerTimes}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper)] disabled:opacity-50"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync prayer times"}
              </button>
              {syncResult && (
                <p
                  className="mt-2 flex items-center gap-1.5 text-xs"
                  style={{ color: syncResult.ok ? "var(--color-success)" : "var(--color-error)" }}
                >
                  {syncResult.ok ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {syncResult.message}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
            No location set. Complete onboarding to configure prayer times.
          </p>
        )}
      </section>

      {/* ── Notification Preferences ── */}
      <section
        className="mb-6 rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
            Notifications
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {/* Early/Mid prayer reminders */}
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Prayer reminders (early & mid)
            </label>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              How you want to be reminded when a prayer window opens.
            </p>
            <select
              value={notifPrefs.prayerEarlyMid}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, prayerEarlyMid: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
                color: "var(--color-ink)",
              }}
            >
              <option value="push">Push notification</option>
              <option value="push_sms">Push + SMS</option>
              <option value="sms">SMS only</option>
            </select>
          </div>

          {/* Final prayer reminder */}
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Final prayer reminder
            </label>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Last-call reminder before the prayer window closes.
            </p>
            <select
              value={notifPrefs.prayerFinal}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, prayerFinal: e.target.value })}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
                color: "var(--color-ink)",
              }}
            >
              <option value="push">Push notification</option>
              <option value="push_sms">Push + SMS</option>
              <option value="sms">SMS only</option>
            </select>
          </div>

          {/* Other reminders */}
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              Other reminders
            </label>
            <p className="mb-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Calendar events, huddle tasks, etc. Push only — no SMS.
            </p>
            <select
              value={notifPrefs.otherReminders}
              onChange={(e) => setNotifPrefs({ ...notifPrefs, otherReminders: e.target.value })}
              disabled
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none opacity-70"
              style={{
                borderColor: "var(--color-paper-3)",
                backgroundColor: "var(--color-paper)",
                color: "var(--color-ink)",
              }}
            >
              <option value="push">Push notification</option>
            </select>
          </div>

          {/* Save button */}
          <div>
            <button
              onClick={handleSaveNotifs}
              disabled={savingNotif}
              className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              {savingNotif ? "Saving..." : "Save notifications"}
            </button>
            {notifResult && (
              <p
                className="mt-2 flex items-center gap-1.5 text-xs"
                style={{ color: notifResult.ok ? "var(--color-success)" : "var(--color-error)" }}
              >
                {notifResult.ok ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {notifResult.message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const METHOD_LABELS: Record<number, string> = {
  1: "University of Islamic Sciences, Karachi",
  2: "ISNA (North America)",
  3: "Muslim World League",
  4: "Umm Al-Qura, Makkah",
  5: "Egyptian General Authority",
  7: "University of Tehran",
  8: "Gulf Region",
  9: "Kuwait",
  10: "Qatar",
  11: "Singapore",
  12: "France",
  13: "Turkey",
  14: "Russia",
  15: "Moonsighting Committee Worldwide",
  16: "Dubai",
  17: "JAKIM (Malaysia)",
  18: "Tunisia",
  19: "Algeria",
  20: "KEMENAG (Indonesia)",
  21: "Morocco",
  22: "Communauté Islamique de Genève",
  23: "Spiritual Administration of Muslims of Russia",
};
