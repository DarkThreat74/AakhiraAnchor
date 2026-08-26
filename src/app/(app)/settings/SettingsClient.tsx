"use client";

import { useState, useEffect } from "react";
import { MapPin, RefreshCw, Check, AlertCircle, LogOut, Link2, Copy, ExternalLink, Trash2, User, Bell, BellOff, Send, Sun, Moon, Monitor } from "lucide-react";

interface PrayerSettings {
  latitude: string;
  longitude: string;
  timezone: string;
  calculationMethod: number;
  madhab: string | null;
}

interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

const PRAYER_LABELS: Array<{ key: keyof PrayerTimes; label: string }> = [
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

const METHOD_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 2, label: "ISNA (North America)" },
  { value: 3, label: "Muslim World League" },
  { value: 4, label: "Umm Al-Qura, Makkah" },
  { value: 1, label: "University of Islamic Sciences, Karachi" },
  { value: 5, label: "Egyptian General Authority" },
  { value: 7, label: "University of Tehran" },
  { value: 8, label: "Gulf Region" },
  { value: 9, label: "Kuwait" },
  { value: 10, label: "Qatar" },
  { value: 16, label: "Dubai" },
  { value: 11, label: "Singapore" },
  { value: 12, label: "France" },
  { value: 13, label: "Turkey" },
  { value: 14, label: "Russia" },
  { value: 15, label: "Moonsighting Committee Worldwide" },
  { value: 17, label: "JAKIM (Malaysia)" },
  { value: 18, label: "Tunisia" },
  { value: 19, label: "Algeria" },
  { value: 20, label: "KEMENAG (Indonesia)" },
  { value: 21, label: "Morocco" },
  { value: 22, label: "Communauté Islamique de Genève" },
  { value: 23, label: "Spiritual Administration of Muslims of Russia" },
];

function methodLabel(value: number): string {
  return METHOD_OPTIONS.find((m) => m.value === value)?.label || `Method ${value}`;
}

// Red dot — shows next to required fields that aren't filled
function RedDot() {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: "#dc2626" }}
      aria-label="Required — please fill in this field"
    />
  );
}

export default function SettingsClient({
  displayName: initialDisplayName,
  prayerSettings: initialSettings,
  todayPrayerTimes: initialTimes,
}: {
  displayName: string | null;
  prayerSettings: PrayerSettings | null;
  todayPrayerTimes: PrayerTimes | null;
}) {
  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings | null>(initialSettings);
  const [todayPrayerTimes, setTodayPrayerTimes] = useState<PrayerTimes | null>(initialTimes);

  // Theme state: "light" | "dark" | "system"
  // Lazy initializer reads localStorage once — no effect needed
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    if (typeof window === "undefined") return "system";
    const stored = localStorage.getItem("waqt:theme");
    if (stored === "light" || stored === "dark") return stored;
    return "system";
  });

  function handleThemeChange(next: "light" | "dark" | "system") {
    setTheme(next);
    if (next === "system") {
      localStorage.removeItem("waqt:theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      localStorage.setItem("waqt:theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }
  }

  // Display name state
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialDisplayName || "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Location search state
  const [cityQuery, setCityQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locationResult, setLocationResult] = useState<{
    lat: string;
    lng: string;
    timezone: string;
    displayName: string;
  } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Calculation method state
  const [selectedMethod, setSelectedMethod] = useState<number>(initialSettings?.calculationMethod || 2);
  const [savingMethod, setSavingMethod] = useState(false);
  const [methodMsg, setMethodMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Madhab state
  const [selectedMadhab, setSelectedMadhab] = useState<string>(initialSettings?.madhab || "standard");
  const [savingMadhab, setSavingMadhab] = useState(false);
  const [madhabMsg, setMadhabMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Prayer times sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Share link state
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(true);
  const [shareGenerating, setShareGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Prayer code state
  const [prayerCode, setPrayerCode] = useState<string | null>(null);
  const [prayerCodeCopied, setPrayerCodeCopied] = useState(false);

  // Notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [notifEnabling, setNotifEnabling] = useState(false);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);
  const [swStatus, setSwStatus] = useState<string>("checking...");
  const [pushStatus, setPushStatus] = useState<string>("checking...");

  // Logout state
  const [loggingOut, setLoggingOut] = useState(false);

  // Load share link status on mount
  useEffect(() => {
    if ("Notification" in window) {
      const perm = Notification.permission;
      requestAnimationFrame(() => setNotifPermission(perm));
    } else {
      requestAnimationFrame(() => setNotifPermission("denied"));
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus("Registered (scope: " + reg.scope + ")");
          if ("PushManager" in window && reg.pushManager) {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) {
                setPushStatus("Subscribed to push");
              } else {
                setPushStatus("Not subscribed to push");
              }
            }).catch(() => setPushStatus("Push check failed"));
          } else {
            setPushStatus("Push not supported");
          }
        } else {
          setSwStatus("Not registered");
          setPushStatus("No SW — push unavailable");
        }
      }).catch(() => setSwStatus("SW check failed"));
    } else {
      requestAnimationFrame(() => {
        setSwStatus("Not supported");
        setPushStatus("Not supported");
      });
    }

    fetch("/api/share/generate")
      .then((r) => r.json())
      .then((data) => {
        setShareEnabled(data.enabled);
        if (data.url) {
          setShareUrl(`${window.location.origin}${data.url}`);
        }
      })
      .catch(() => {})
      .finally(() => setShareLoading(false));

    fetch("/api/prayer-friends/my-code")
      .then((r) => r.json())
      .then((data) => { if (data.prayerCode) setPrayerCode(data.prayerCode); })
      .catch(() => {});
  }, []);

  async function handleCitySearch(e: React.FormEvent) {
    e.preventDefault();
    if (!cityQuery.trim()) return;
    setSearching(true);
    setLocationResult(null);
    setLocationMsg(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`,
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const results = await res.json();
        if (results.length > 0) {
          const result = results[0];
          let timezone = "UTC";
          try {
            const tzRes = await fetch(
              `https://api.latlng.work/v1/timezone?lat=${result.lat}&lng=${result.lon}`,
            );
            if (tzRes.ok) {
              const tzData = await tzRes.json();
              if (tzData.timezone) timezone = tzData.timezone;
            }
          } catch {
            // Fall back to UTC
          }
          setLocationResult({
            lat: result.lat,
            lng: result.lon,
            timezone,
            displayName: result.display_name,
          });
        } else {
          setLocationMsg({ ok: false, text: "No results found. Try a different search." });
        }
      } else {
        setLocationMsg({ ok: false, text: "Search failed. Try again." });
      }
    } catch {
      setLocationMsg({ ok: false, text: "Network error. Try again." });
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveLocation() {
    if (!locationResult) return;
    setSavingLocation(true);
    setLocationMsg(null);
    try {
      const res = await fetch("/api/onboarding/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: locationResult.lat,
          longitude: locationResult.lng,
          timezone: locationResult.timezone,
          calculationMethod: selectedMethod,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrayerSettings({
          latitude: locationResult.lat,
          longitude: locationResult.lng,
          timezone: locationResult.timezone,
          calculationMethod: data.calculationMethod || selectedMethod,
          madhab: prayerSettings?.madhab || null,
        });
        setLocationMsg({ ok: true, text: "Location saved. Syncing prayer times..." });
        const syncRes = await fetch("/api/prayer-times/sync", { method: "POST" });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          setLocationMsg({ ok: true, text: `Location saved. Prayer times synced (${syncData.daysCached} days).` });
          await refreshPrayerTimes();
        } else {
          setLocationMsg({ ok: true, text: "Location saved. Click Sync to fetch prayer times." });
        }
      } else {
        const data = await res.json();
        setLocationMsg({ ok: false, text: data.error || "Failed to save location." });
      }
    } catch {
      setLocationMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleSaveMethod() {
    if (!prayerSettings) return;
    setSavingMethod(true);
    setMethodMsg(null);
    try {
      const res = await fetch("/api/onboarding/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: prayerSettings.latitude,
          longitude: prayerSettings.longitude,
          timezone: prayerSettings.timezone,
          calculationMethod: selectedMethod,
          madhab: selectedMadhab,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrayerSettings({ ...prayerSettings, calculationMethod: data.calculationMethod || selectedMethod });
        setMethodMsg({ ok: true, text: "Method saved. Re-syncing prayer times..." });
        const syncRes = await fetch("/api/prayer-times/sync", { method: "POST" });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          setMethodMsg({ ok: true, text: `Method updated. Prayer times re-synced (${syncData.daysCached} days).` });
          await refreshPrayerTimes();
        } else {
          setMethodMsg({ ok: true, text: "Method saved. Click Sync to update prayer times." });
        }
      } else {
        const data = await res.json();
        setMethodMsg({ ok: false, text: data.error || "Failed to save method." });
      }
    } catch {
      setMethodMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingMethod(false);
    }
  }

  async function handleSaveMadhab() {
    if (!prayerSettings) return;
    setSavingMadhab(true);
    setMadhabMsg(null);
    try {
      const res = await fetch("/api/onboarding/save-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: prayerSettings.latitude,
          longitude: prayerSettings.longitude,
          timezone: prayerSettings.timezone,
          calculationMethod: selectedMethod,
          madhab: selectedMadhab,
        }),
      });
      if (res.ok) {
        setPrayerSettings({ ...prayerSettings, madhab: selectedMadhab });
        setMadhabMsg({ ok: true, text: "Madhab saved. Re-syncing prayer times..." });
        const syncRes = await fetch("/api/prayer-times/sync", { method: "POST" });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          setMadhabMsg({ ok: true, text: `Madhab updated. Prayer times re-synced (${syncData.daysCached} days).` });
          await refreshPrayerTimes();
        } else {
          setMadhabMsg({ ok: true, text: "Madhab saved. Click Sync to update prayer times." });
        }
      } else {
        const data = await res.json();
        setMadhabMsg({ ok: false, text: data.error || "Failed to save madhab." });
      }
    } catch {
      setMadhabMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingMadhab(false);
    }
  }

  async function refreshPrayerTimes() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/prayer-times?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        const fmt = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          const hour = h % 12 || 12;
          const period = h < 12 ? "AM" : "PM";
          return `${hour}:${String(m).padStart(2, "0")} ${period}`;
        };
        setTodayPrayerTimes({
          fajr: fmt(data.fajr),
          sunrise: fmt(data.sunrise),
          dhuhr: fmt(data.dhuhr),
          asr: fmt(data.asr),
          maghrib: fmt(data.maghrib),
          isha: fmt(data.isha),
        });
      }
    } catch {
      // ignore
    }
  }

  async function handleSyncPrayerTimes() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/prayer-times/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg({ ok: true, text: `Synced ${data.daysCached} days of prayer times.` });
        await refreshPrayerTimes();
      } else {
        setSyncMsg({ ok: false, text: data.error || "Sync failed." });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Network error." });
    } finally {
      setSyncing(false);
    }
  }

  async function handleGenerateShare() {
    setShareGenerating(true);
    setShareError(null);
    try {
      const res = await fetch("/api/share/generate", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.token) {
        setShareEnabled(true);
        setShareUrl(`${window.location.origin}${data.url}`);
      } else {
        setShareError(data.error || "Failed to generate link.");
      }
    } catch {
      setShareError("Network error.");
    } finally {
      setShareGenerating(false);
    }
  }

  async function handleDisableShare() {
    setShareError(null);
    try {
      const res = await fetch("/api/share/generate", { method: "DELETE" });
      if (res.ok) {
        setShareEnabled(false);
        setShareUrl(null);
      } else {
        const data = await res.json();
        setShareError(data.error || "Failed to disable sharing.");
      }
    } catch {
      setShareError("Network error.");
    }
  }

  async function handleCopyPrayerCode() {
    if (!prayerCode) return;
    try {
      await navigator.clipboard.writeText(prayerCode);
      setPrayerCodeCopied(true);
      setTimeout(() => setPrayerCodeCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = prayerCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setPrayerCodeCopied(true);
        setTimeout(() => setPrayerCodeCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const input = document.getElementById("share-url-input") as HTMLInputElement | null;
        if (input) input.select();
      }
    }
  }

  async function handleEnableNotifications() {
    setNotifEnabling(true);
    setNotifMsg(null);
    try {
      if (!("Notification" in window)) {
        setNotifMsg("Notifications are not supported on this device.");
        return;
      }
      let reg: ServiceWorkerRegistration | undefined;
      if ("serviceWorker" in navigator) {
        reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          try {
            reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
            await navigator.serviceWorker.ready;
          } catch {
            // SW registration failed
          }
        }
      }
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === "granted") {
        let pushSubscribed = false;
        try {
          if (reg && "PushManager" in window) {
            let subscription = await reg.pushManager.getSubscription();
            if (!subscription) {
              const keyRes = await fetch("/api/notifications/vapid-public-key");
              if (keyRes.ok) {
                const { publicKey } = await keyRes.json();
                if (publicKey) {
                  subscription = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                  });
                }
              }
            }
            if (subscription) {
              await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription),
              });
              pushSubscribed = true;
            }
          }
        } catch (err) {
          console.warn("[Waqt] Push subscription failed:", err);
        }
        try {
          if (reg) {
            reg.showNotification("Waqt notifications are on", {
              body: pushSubscribed
                ? "You'll be notified at each prayer time and before reminders — even in the background."
                : "You'll be notified at each prayer time and before reminders while the app is open.",
              tag: "waqt-test",
              data: { url: "/calendar/day" },
              icon: "/icon.svg",
              badge: "/icon.svg",
            });
          } else if ("Notification" in window) {
            new Notification("Waqt notifications are on", {
              body: "You'll be notified at each prayer time and before reminders while the app is open.",
              tag: "waqt-test",
              icon: "/icon.svg",
            });
          }
        } catch (notifErr) {
          console.warn("[Waqt] Test notification failed:", notifErr);
        }
        setNotifMsg(pushSubscribed
          ? "Notifications enabled with background push! You'll get alerts at each prayer time."
          : "Notifications enabled! You'll get alerts at each prayer time while the app is open."
        );
        window.dispatchEvent(new CustomEvent("waqt:notifications-enabled"));
      } else if (perm === "denied") {
        setNotifMsg("Notifications were blocked. Enable them in your browser settings to receive prayer alerts.");
      } else {
        setNotifMsg("Notification permission was dismissed. Tap the button again to enable.");
      }
    } catch (err) {
      console.error("[Waqt] Enable notifications failed:", err);
      setNotifMsg("Could not request notification permission. Try again.");
    } finally {
      setNotifEnabling(false);
      setTimeout(() => setNotifMsg(null), 6000);
    }
  }

  async function handleResetSW() {
    setNotifMsg("Resetting service worker...");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      setNotifMsg("Service worker reset. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setNotifMsg("Reset failed. Try closing all tabs and reopening.");
      setTimeout(() => setNotifMsg(null), 4000);
    }
  }

  async function handleServerPushTest() {
    setNotifMsg(null);
    try {
      const res = await fetch("/api/notifications/test", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.sent > 0) {
        setNotifMsg(`Server push test sent (${data.sent} delivered). Check your notifications.`);
      } else if (res.ok && data.sent === 0) {
        setNotifMsg("No push subscriptions found. Tap Enable notifications first.");
      } else {
        setNotifMsg(data.error || "Failed to send server push test.");
      }
    } catch {
      setNotifMsg("Network error sending push test.");
    }
    setTimeout(() => setNotifMsg(null), 5000);
  }

  async function handleTestNotification() {
    setNotifMsg(null);
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        setNotifMsg("Enable notifications first.");
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        reg.showNotification("Test notification from Waqt", {
          body: "If you can see this, notifications are working correctly.",
          tag: "waqt-test",
          data: { url: "/calendar/day" },
          icon: "/icon.svg",
          badge: "/icon.svg",
        });
        setNotifMsg("Test notification sent. Check your notifications.");
      } else {
        new Notification("Test notification from Waqt", {
          body: "If you can see this, notifications are working correctly.",
          tag: "waqt-test",
        });
        setNotifMsg("Test notification sent.");
      }
    } catch {
      setNotifMsg("Failed to send test notification.");
    }
    setTimeout(() => setNotifMsg(null), 4000);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  async function handleSaveName() {
    if (!nameInput.trim()) {
      setNameMsg({ ok: false, text: "Name is required." });
      return;
    }
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await fetch("/api/settings/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: nameInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName);
        setEditingName(false);
        setNameMsg({ ok: true, text: "Name updated." });
        if (shareEnabled) {
          const shareRes = await fetch("/api/share/generate");
          if (shareRes.ok) {
            const shareData = await shareRes.json();
            if (shareData.url) {
              setShareUrl(`${window.location.origin}${shareData.url}`);
            }
          }
        }
        setTimeout(() => setNameMsg(null), 3000);
      } else {
        const data = await res.json();
        setNameMsg({ ok: false, text: data.error || "Failed to save name." });
      }
    } catch {
      setNameMsg({ ok: false, text: "Network error." });
    } finally {
      setSavingName(false);
    }
  }

  const needsName = !displayName;
  const needsLocation = !prayerSettings?.latitude || !prayerSettings?.longitude;
  const needsMethod = !prayerSettings?.calculationMethod;
  const needsMadhab = !prayerSettings?.madhab;

  return (
    <div className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-xl font-semibold tracking-tight sm:mb-8 sm:text-2xl" style={{ color: "var(--color-ink)" }}>
        Settings
      </h1>

      {/* ── Single unified settings card ── */}
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        {/* ── Appearance: Theme ── */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Appearance</h2>
          </div>

          <div className="mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
              Theme
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleThemeChange("light")}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors"
              style={{
                borderColor: theme === "light" ? "var(--color-accent)" : "var(--color-paper-3)",
                backgroundColor: theme === "light" ? "color-mix(in oklab, var(--color-accent) 8%, transparent)" : "transparent",
              }}
            >
              <Sun className="h-4 w-4" style={{ color: theme === "light" ? "var(--color-accent)" : "var(--color-ink-muted)" }} />
              <span className="text-xs font-medium" style={{ color: theme === "light" ? "var(--color-accent)" : "var(--color-ink-muted)" }}>
                Light
              </span>
            </button>
            <button
              onClick={() => handleThemeChange("dark")}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors"
              style={{
                borderColor: theme === "dark" ? "var(--color-accent)" : "var(--color-paper-3)",
                backgroundColor: theme === "dark" ? "color-mix(in oklab, var(--color-accent) 8%, transparent)" : "transparent",
              }}
            >
              <Moon className="h-4 w-4" style={{ color: theme === "dark" ? "var(--color-accent)" : "var(--color-ink-muted)" }} />
              <span className="text-xs font-medium" style={{ color: theme === "dark" ? "var(--color-accent)" : "var(--color-ink-muted)" }}>
                Dark
              </span>
            </button>
            <button
              onClick={() => handleThemeChange("system")}
              className="flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors"
              style={{
                borderColor: theme === "system" ? "var(--color-accent)" : "var(--color-paper-3)",
                backgroundColor: theme === "system" ? "color-mix(in oklab, var(--color-accent) 8%, transparent)" : "transparent",
              }}
            >
              <Monitor className="h-4 w-4" style={{ color: theme === "system" ? "var(--color-accent)" : "var(--color-ink-muted)" }} />
              <span className="text-xs font-medium" style={{ color: theme === "system" ? "var(--color-accent)" : "var(--color-ink-muted)" }}>
                System
              </span>
            </button>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--color-paper-3)" }} />

        {/* ── Profile: Name + Prayer Code ── */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Profile</h2>
          </div>

          {/* Name */}
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Display Name
              </span>
              {needsName && <RedDot />}
            </div>
            {!editingName ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium" style={{ color: needsName ? "var(--color-ink-muted)" : "var(--color-ink)" }}>
                  {displayName || "Not set"}
                </span>
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true); setNameMsg(null); }}
                  className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  maxLength={50}
                  placeholder="Your name"
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                  style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditingName(false);
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={savingName || !nameInput.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
                  >
                    {savingName ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameMsg(null); }}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                    style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {nameMsg && (
              <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: nameMsg.ok ? "var(--color-success)" : "var(--color-error)" }}>
                {nameMsg.ok ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {nameMsg.text}
              </p>
            )}
          </div>

          {/* Prayer Code */}
          <div className="mt-4">
            <div className="mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Prayer Code
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-lg border px-3 py-2 text-center text-base font-bold tracking-[0.3em]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
              >
                {prayerCode || "------"}
              </div>
              <button
                onClick={handleCopyPrayerCode}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
              >
                {prayerCodeCopied ? (
                  <><Check className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} /> Copied</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" /> Copy</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--color-paper-3)" }} />

        {/* ── Prayer Settings: Location + Method + Madhab + Times ── */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Prayer Settings</h2>
          </div>

          {/* Location */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Location
              </span>
              {needsLocation && <RedDot />}
            </div>
            {prayerSettings?.latitude ? (
              <p className="mb-2 text-xs tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                {prayerSettings.latitude}, {prayerSettings.longitude} · {prayerSettings.timezone}
              </p>
            ) : (
              <p className="mb-2 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                No location set. Search for your city.
              </p>
            )}
            <form onSubmit={handleCitySearch} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                placeholder="Search for your city..."
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
              />
              <button
                type="submit"
                disabled={searching}
                className="shrink-0 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-50"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 44 }}
              >
                {searching ? "..." : "Search"}
              </button>
            </form>
            {locationResult && (
              <div className="mt-2 rounded-lg border p-3" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}>
                <p className="break-words text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  {locationResult.displayName}
                </p>
                <p className="mt-1 break-all text-xs tabular-nums" style={{ color: "var(--color-ink-muted)" }}>
                  {locationResult.lat}, {locationResult.lng} · {locationResult.timezone}
                </p>
                <button
                  onClick={handleSaveLocation}
                  disabled={savingLocation}
                  className="mt-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
                >
                  {savingLocation ? "Saving..." : "Save this location"}
                </button>
              </div>
            )}
            {locationMsg && (
              <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: locationMsg.ok ? "var(--color-success)" : "var(--color-error)" }}>
                {locationMsg.ok ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{locationMsg.text}</span>
              </p>
            )}
          </div>

          {/* Calculation Method */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Calculation Method
              </span>
              {needsMethod && <RedDot />}
            </div>
            <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
              Determines Fajr/Isha angles. ISNA (15°) is default for North America. MWL (18°) gives earlier Fajr.
            </p>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {prayerSettings && selectedMethod !== prayerSettings.calculationMethod && (
              <button
                onClick={handleSaveMethod}
                disabled={savingMethod}
                className="mt-2 w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-40 sm:w-auto sm:self-start"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", minHeight: 40 }}
              >
                {savingMethod ? "Saving..." : "Save method"}
              </button>
            )}
            {prayerSettings && (
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
                Current: {methodLabel(prayerSettings.calculationMethod)}
              </p>
            )}
            {methodMsg && (
              <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: methodMsg.ok ? "var(--color-success)" : "var(--color-error)" }}>
                {methodMsg.ok ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{methodMsg.text}</span>
              </p>
            )}
          </div>

          {/* Madhab */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Madhab (School of Thought)
              </span>
              {needsMadhab && <RedDot />}
            </div>
            <p className="mb-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
              Determines Asr time and which sunnahs are tracked. Hanafi uses a later Asr.
            </p>
            <select
              value={selectedMadhab}
              onChange={(e) => setSelectedMadhab(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
            >
              <option value="standard">Standard (Shafi&apos;i, Maliki, Hanbali)</option>
              <option value="hanafi">Hanafi</option>
            </select>
            {prayerSettings && selectedMadhab !== prayerSettings.madhab && (
              <button
                onClick={handleSaveMadhab}
                disabled={savingMadhab}
                className="mt-2 w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-40 sm:w-auto sm:self-start"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", minHeight: 40 }}
              >
                {savingMadhab ? "Saving..." : "Save madhab"}
              </button>
            )}
            {madhabMsg && (
              <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: madhabMsg.ok ? "var(--color-success)" : "var(--color-error)" }}>
                {madhabMsg.ok ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{madhabMsg.text}</span>
              </p>
            )}
          </div>

          {/* Today's Prayer Times */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Today&apos;s Prayer Times
              </span>
              <button
                onClick={handleSyncPrayerTimes}
                disabled={syncing || !prayerSettings}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-50"
                style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "..." : "Sync"}
              </button>
            </div>
            {todayPrayerTimes ? (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {PRAYER_LABELS.map((prayer) => (
                  <div
                    key={prayer.key}
                    className="flex flex-col items-center gap-0.5 rounded-lg border py-2"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
                  >
                    <span className="text-[10px] font-medium" style={{ color: "var(--color-ink-muted)" }}>
                      {prayer.label}
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>
                      {todayPrayerTimes[prayer.key]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                {prayerSettings ? "No prayer times cached. Click Sync." : "Set your location to get prayer times."}
              </p>
            )}
            {syncMsg && (
              <p className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: syncMsg.ok ? "var(--color-success)" : "var(--color-error)" }}>
                {syncMsg.ok ? <Check className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />}
                <span>{syncMsg.text}</span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--color-paper-3)" }} />

        {/* ── Sharing ── */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Sharing</h2>
          </div>
          {shareLoading ? (
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</p>
          ) : shareEnabled && shareUrl ? (
            <div className="flex flex-col gap-3">
              <div
                className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}
              >
                <span className="min-w-0 flex-1 truncate text-xs" style={{ color: "var(--color-ink-soft)", wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {shareUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-[var(--color-paper-3)]"
                  style={{ color: "var(--color-ink-soft)" }}
                >
                  {copied ? (
                    <><Check className="h-3 w-3" style={{ color: "var(--color-success)" }} /> Copied</>
                  ) : (
                    <><Copy className="h-3 w-3" /> Copy</>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)]"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </a>
                <button
                  onClick={handleGenerateShare}
                  disabled={shareGenerating}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-50"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
                >
                  <Link2 className="h-3 w-3" />
                  {shareGenerating ? "..." : "Regenerate"}
                </button>
                <button
                  onClick={handleDisableShare}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:opacity-80"
                  style={{ color: "var(--color-error)" }}
                >
                  <Trash2 className="h-3 w-3" />
                  Disable
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleGenerateShare}
              disabled={shareGenerating}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
            >
              <Link2 className="h-4 w-4" />
              {shareGenerating ? "Creating link..." : "Create public link"}
            </button>
          )}
          {shareError && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-error)" }}>{shareError}</p>
          )}
        </div>

        <div className="border-t" style={{ borderColor: "var(--color-paper-3)" }} />

        {/* ── Notifications ── */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            {notifPermission === "granted" ? (
              <Bell className="h-4 w-4 shrink-0" style={{ color: "var(--color-success)" }} />
            ) : (
              <BellOff className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
            )}
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Notifications</h2>
            <span className="text-xs" style={{ color: notifPermission === "granted" ? "var(--color-success)" : notifPermission === "denied" ? "var(--color-warmth)" : "var(--color-ink-muted)" }}>
              {notifPermission === "granted" ? "Enabled" : notifPermission === "denied" ? "Blocked" : "Not set up"}
            </span>
          </div>
          {notifPermission === "denied" && (
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
              Notifications are blocked. Enable them in your browser site settings.
            </p>
          )}
          {notifPermission === "granted" && (
            <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--color-ink-muted)" }}>
              You&apos;ll receive a notification at each prayer time and 15 minutes before events.
            </p>
          )}
          {notifMsg && (
            <div className="mb-3 text-xs font-medium" style={{ color: notifMsg.includes("enabled") || notifMsg.includes("working") || notifMsg.includes("sent") ? "var(--color-success)" : "var(--color-warmth)" }}>
              {notifMsg}
            </div>
          )}
          <div className="mb-3 rounded-lg border p-2.5" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)" }}>
            <div className="space-y-0.5 text-[11px]" style={{ color: "var(--color-ink-soft)" }}>
              <p><span style={{ color: "var(--color-ink-muted)" }}>SW:</span> {swStatus}</p>
              <p><span style={{ color: "var(--color-ink-muted)" }}>Push:</span> {pushStatus}</p>
              <p><span style={{ color: "var(--color-ink-muted)" }}>Platform:</span> {typeof navigator !== "undefined" ? (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad") ? "iOS" : "Desktop/Android") : "unknown"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {notifPermission !== "granted" && (
              <button
                onClick={handleEnableNotifications}
                disabled={notifEnabling || notifPermission === "denied"}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
              >
                {notifEnabling ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Enabling...</>
                ) : (
                  <><Bell className="h-4 w-4" /> Enable notifications</>
                )}
              </button>
            )}
            {notifPermission === "granted" && (
              <>
                <button
                  onClick={handleTestNotification}
                  className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
                >
                  <Send className="h-4 w-4" />
                  Test local
                </button>
                <button
                  onClick={handleServerPushTest}
                  className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", minHeight: 40 }}
                >
                  <Send className="h-4 w-4" />
                  Test background push
                </button>
              </>
            )}
          </div>
          <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--color-paper-3)" }}>
            <button
              onClick={handleResetSW}
              className="text-xs font-medium underline underline-offset-2"
              style={{ color: "var(--color-ink-muted)" }}
            >
              Reset service worker & reload
            </button>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "var(--color-paper-3)" }} />

        {/* ── Logout ── */}
        <div className="p-4 sm:p-6">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-paper-2)] disabled:opacity-50"
            style={{ borderColor: "var(--color-paper-3)", color: "var(--color-error)" }}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
