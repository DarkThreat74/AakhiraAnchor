"use client";

import { useState, useEffect } from "react";
import { Flame, MapPin, Users, UserPlus, Copy, Check, Calendar, X } from "lucide-react";

interface PerPrayerStats {
  prayer: string;
  totalPrayed: number;
  masjidCount: number;
  masjidPct: number;
  avgTimeMinutes: number | null;
  avgTimeStr: string | null;
  makruhPct: number;
  consistencyPct: number;
}

interface Analytics {
  streak: number;
  totalCompleteDays: number;
  totalPrayed: number;
  totalMasjid: number;
  masjidPct: number;
  perPrayer: PerPrayerStats[];
  timezone: string;
  thisWeekPrayed: number;
  thisMonthPrayed: number;
  lastPrayedDate: string | null;
}

interface Friend {
  id: string;
  firstName: string | null;
  displayName: string | null;
  streak: number;
  totalCompleteDays: number;
  totalPrayed: number;
  masjidPct: number;
  thisWeekPrayed: number;
  lastPrayedDate: string | null;
}

interface QadaaInfo {
  fajrOwed: number;
  dhuhrOwed: number;
  asrOwed: number;
  maghribOwed: number;
  ishaOwed: number;
  setupCompleted: boolean;
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

const PRAYER_COLORS: Record<string, string> = {
  fajr: "#1e40af",
  dhuhr: "#c2410c",
  asr: "#7c3aed",
  maghrib: "#be185d",
  isha: "#0e7490",
};

export default function PrayerDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [prayerCode, setPrayerCode] = useState<string | null>(null);
  const [qadaa, setQadaa] = useState<QadaaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addFriendCode, setAddFriendCode] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qadaaMsg, setQadaaMsg] = useState<string | null>(null);
  const [setupFajr, setSetupFajr] = useState(0);
  const [setupDhuhr, setSetupDhuhr] = useState(0);
  const [setupAsr, setSetupAsr] = useState(0);
  const [setupMaghrib, setSetupMaghrib] = useState(0);
  const [setupIsha, setSetupIsha] = useState(0);
  const [qadaaSetting, setQadaaSetting] = useState(false);
  const [adjustPrayer, setAdjustPrayer] = useState<string>("fajr");
  const [adjustAmount, setAdjustAmount] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [analyticsRes, friendsRes, codeRes, qadaaRes] = await Promise.all([
          fetch("/api/prayer-log/analytics").catch(() => null),
          fetch("/api/prayer-friends").catch(() => null),
          fetch("/api/prayer-friends/my-code").catch(() => null),
          fetch("/api/qadaa").catch(() => null),
        ]);

        if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
        if (friendsRes?.ok) setFriends(await friendsRes.json());
        if (codeRes?.ok) {
          const data = await codeRes.json();
          setPrayerCode(data.prayerCode);
        }
        if (qadaaRes?.ok) {
          setQadaa(await qadaaRes.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleSynced = () => {
      (async () => {
        try {
          const [analyticsRes, friendsRes, qadaaRes] = await Promise.all([
            fetch("/api/prayer-log/analytics").catch(() => null),
            fetch("/api/prayer-friends").catch(() => null),
            fetch("/api/qadaa").catch(() => null),
          ]);
          if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
          if (friendsRes?.ok) setFriends(await friendsRes.json());
          if (qadaaRes?.ok) setQadaa(await qadaaRes.json());
        } catch {
          // ignore
        }
      })();
    };
    window.addEventListener("waqt:events-synced", handleSynced);
    return () => window.removeEventListener("waqt:events-synced", handleSynced);
  }, []);

  async function handleCopyCode() {
    if (!prayerCode) return;
    try {
      await navigator.clipboard.writeText(prayerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleAddFriend() {
    if (!addFriendCode.trim()) return;
    setFriendError(null);
    setFriendSuccess(null);
    setAddingFriend(true);
    try {
      const res = await fetch("/api/prayer-friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: addFriendCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok && !data.offline) {
        setFriends((prev) => [...prev, data.friend]);
        setFriendSuccess(`Added ${data.friend.firstName || data.friend.displayName || "friend"}! You can now see each other's stats.`);
        setAddFriendCode("");
        setTimeout(() => setFriendSuccess(null), 4000);
      } else if (data.offline) {
        setFriendSuccess("Saved offline — will sync when online.");
        setAddFriendCode("");
        setTimeout(() => setFriendSuccess(null), 3000);
      } else {
        setFriendError(data.error || "Failed to add friend.");
      }
    } catch {
      setFriendError("Network error.");
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleRemoveFriend(friendId: string) {
    try {
      const res = await fetch(`/api/prayer-friends/remove?friendId=${friendId}`, { method: "DELETE" });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
      }
    } catch {
      // ignore
    }
  }

  async function handleQadaaSetup() {
    setQadaaSetting(true);
    setQadaaMsg(null);
    try {
      const res = await fetch("/api/qadaa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fajr: setupFajr,
          dhuhr: setupDhuhr,
          asr: setupAsr,
          maghrib: setupMaghrib,
          isha: setupIsha,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.offline) {
        setQadaa(data);
        setQadaaMsg("Qadaa set up successfully.");
        setTimeout(() => setQadaaMsg(null), 3000);
      } else if (data.offline) {
        setQadaa({
          fajrOwed: setupFajr,
          dhuhrOwed: setupDhuhr,
          asrOwed: setupAsr,
          maghribOwed: setupMaghrib,
          ishaOwed: setupIsha,
          setupCompleted: true,
        });
        setQadaaMsg("Saved offline — will sync when online.");
        setTimeout(() => setQadaaMsg(null), 3000);
      } else {
        setQadaaMsg(data.error || "Failed to set up qadaa.");
      }
    } catch {
      setQadaaMsg("Network error.");
    } finally {
      setQadaaSetting(false);
    }
  }

  async function handleQadaaAdjust(delta: number) {
    try {
      const res = await fetch("/api/qadaa/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prayer: adjustPrayer, amount: delta }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.offline) {
          if (qadaa) {
            const colMap: Record<string, keyof typeof qadaa> = {
              fajr: "fajrOwed", dhuhr: "dhuhrOwed", asr: "asrOwed",
              maghrib: "maghribOwed", isha: "ishaOwed",
            };
            const col = colMap[adjustPrayer];
            if (col) {
              setQadaa({ ...qadaa, [col]: Math.max(0, (qadaa[col] as number) + delta) });
            }
          }
          setQadaaMsg("Saved offline — will sync when online.");
        } else {
          setQadaa(data);
          setQadaaMsg(delta > 0
            ? `Added ${delta} to ${PRAYER_LABELS[adjustPrayer]} qadaa.`
            : `Logged ${Math.abs(delta)} ${PRAYER_LABELS[adjustPrayer]} qadaa as prayed.`);
        }
        setTimeout(() => setQadaaMsg(null), 3000);
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-r-transparent" style={{ color: "var(--color-accent)" }} />
      </div>
    );
  }

  const myStreak = analytics?.streak || 0;
  const myWeekPrayed = analytics?.thisWeekPrayed || 0;
  const myComplete = analytics?.totalCompleteDays || 0;
  const myMasjidPct = analytics?.masjidPct || 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: "var(--color-ink)" }}>
        Prayer Dashboard
      </h1>

      {/* ── Overview metrics ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Current Streak"
          value={`${myStreak}`}
          sub="days"
          color="var(--color-warmth)"
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="This Week"
          value={`${myWeekPrayed}`}
          sub="prayers"
          color="var(--color-accent)"
        />
        <StatCard
          icon={<Check className="h-4 w-4" />}
          label="Complete Days"
          value={`${myComplete}`}
          sub="all 5 prayed"
          color="var(--color-success)"
        />
        <StatCard
          icon={<MapPin className="h-4 w-4" />}
          label="Masjid Rate"
          value={`${myMasjidPct}%`}
          sub={`${analytics?.totalMasjid || 0} times`}
          color="var(--color-ink-soft)"
        />
      </div>

      {/* ── Per-prayer breakdown ── */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Per-Prayer Breakdown</h2>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>Last 90 days of data</p>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--color-paper-3)" }}>
          {(analytics?.perPrayer || []).map((stat) => {
            const color = PRAYER_COLORS[stat.prayer] || "var(--color-accent)";
            return (
              <div key={stat.prayer} className="px-4 py-3 sm:px-5">
                {/* Prayer name + color bar */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                    {PRAYER_LABELS[stat.prayer] || stat.prayer}
                  </span>
                </div>
                {/* Metrics row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <Metric label="Prayed" value={`${stat.totalPrayed}`} />
                  <Metric label="Consistency" value={`${stat.consistencyPct}%`} />
                  <Metric label="Masjid" value={`${stat.masjidPct}%`} />
                  <Metric label="Avg time" value={stat.avgTimeStr || "—"} />
                </div>
                {/* Consistency bar */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-paper-3)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stat.consistencyPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Qadaa section ── */}
      {qadaa && !qadaa.setupCompleted && (
        <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Set Up Qadaa</h2>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <p className="mb-4 text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Enter how many of each prayer you need to make up. This is a one-time setup — after this, you can log prayed qadaa from here.
            </p>
            <div className="mb-4 space-y-2">
              {([
                { key: "fajr", label: "Fajr", val: setupFajr, set: setSetupFajr },
                { key: "dhuhr", label: "Dhuhr", val: setupDhuhr, set: setSetupDhuhr },
                { key: "asr", label: "Asr", val: setupAsr, set: setSetupAsr },
                { key: "maghrib", label: "Maghrib", val: setupMaghrib, set: setSetupMaghrib },
                { key: "isha", label: "Isha", val: setupIsha, set: setSetupIsha },
              ] as const).map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{p.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={p.val}
                    onChange={(e) => p.set(Math.max(0, Math.min(100000, parseInt(e.target.value) || 0)))}
                    className="w-24 rounded-lg border px-3 py-1.5 text-center text-sm tabular-nums"
                    style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                  />
                </div>
              ))}
            </div>
            <div className="mb-3 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              Total: {setupFajr + setupDhuhr + setupAsr + setupMaghrib + setupIsha} prayers
            </div>
            {qadaaMsg && (
              <div className="mb-3 text-xs font-medium" style={{ color: qadaaMsg.includes("successfully") ? "var(--color-success)" : "var(--color-warmth)" }}>
                {qadaaMsg}
              </div>
            )}
            <button
              onClick={handleQadaaSetup}
              disabled={qadaaSetting || (setupFajr + setupDhuhr + setupAsr + setupMaghrib + setupIsha) === 0}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)", minHeight: 40 }}
            >
              {qadaaSetting ? "Setting up..." : "Set Qadaa"}
            </button>
          </div>
        </div>
      )}

      {qadaa && qadaa.setupCompleted && (
        <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Qadaa Tracker</h2>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-4 grid grid-cols-5 gap-2">
              {([
                { key: "fajr", label: "Fajr", val: qadaa.fajrOwed },
                { key: "dhuhr", label: "Dhuhr", val: qadaa.dhuhrOwed },
                { key: "asr", label: "Asr", val: qadaa.asrOwed },
                { key: "maghrib", label: "Magh", val: qadaa.maghribOwed },
                { key: "isha", label: "Isha", val: qadaa.ishaOwed },
              ] as const).map((p) => (
                <div key={p.key} className="flex flex-col items-center rounded-lg border py-2" style={{ borderColor: "var(--color-paper-3)" }}>
                  <span className="text-[10px] font-medium" style={{ color: "var(--color-ink-muted)" }}>{p.label}</span>
                  <span className="text-base font-bold tabular-nums" style={{ color: p.val > 0 ? "var(--color-warmth)" : "var(--color-success)" }}>
                    {p.val}
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "var(--color-paper-3)" }}>
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Total owed</span>
              <span className="text-xl font-bold tabular-nums" style={{ color: "var(--color-warmth)" }}>
                {qadaa.fajrOwed + qadaa.dhuhrOwed + qadaa.asrOwed + qadaa.maghribOwed + qadaa.ishaOwed}
              </span>
            </div>

            {qadaaMsg && (
              <div className="mb-3 text-xs font-medium" style={{ color: "var(--color-success)" }}>
                {qadaaMsg}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={adjustPrayer}
                onChange={(e) => setAdjustPrayer(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              >
                <option value="fajr">Fajr</option>
                <option value="dhuhr">Dhuhr</option>
                <option value="asr">Asr</option>
                <option value="maghrib">Maghrib</option>
                <option value="isha">Isha</option>
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
                >
                  -
                </button>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-14 rounded-lg border px-2 py-1.5 text-center text-sm tabular-nums"
                  style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                />
                <button
                  onClick={() => setAdjustAmount(Math.min(20, adjustAmount + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => handleQadaaAdjust(-adjustAmount)}
                className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--color-success)", color: "var(--color-success)" }}
              >
                Log prayed
              </button>
              <button
                onClick={() => handleQadaaAdjust(adjustAmount)}
                className="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--color-warmth)", color: "var(--color-warmth)" }}
              >
                Add to backlog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Friends Competition (separate section) ── */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            <Users className="h-4 w-4" /> Friends Competition
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
            Share your code to compete. Adding a friend gives both of you access to each other&apos;s stats.
          </p>
        </div>
        <div className="px-4 py-4 sm:px-5">
          {/* Share code + add friend in one row */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Your code
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 rounded-lg border px-3 py-2 text-center text-base font-bold tracking-widest sm:text-lg"
                  style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
                >
                  {prayerCode || "—"}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)", minHeight: 40 }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
                Add friend
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addFriendCode}
                  onChange={(e) => setAddFriendCode(e.target.value)}
                  placeholder="Enter code"
                  maxLength={6}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm uppercase tracking-widest"
                  style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)", minHeight: 40 }}
                />
                <button
                  onClick={handleAddFriend}
                  disabled={addingFriend || !addFriendCode.trim()}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", minHeight: 40 }}
                >
                  <UserPlus className="h-3.5 w-3.5" /> {addingFriend ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </div>

          {friendError && <p className="mb-3 text-xs" style={{ color: "var(--color-warmth)" }}>{friendError}</p>}
          {friendSuccess && <p className="mb-3 text-xs" style={{ color: "var(--color-success)" }}>{friendSuccess}</p>}

          {/* Leaderboard */}
          {friends.length === 0 ? (
            <div className="rounded-lg border border-dashed py-6 text-center" style={{ borderColor: "var(--color-paper-3)" }}>
              <Users className="mx-auto mb-2 h-6 w-6" style={{ color: "var(--color-ink-muted)" }} />
              <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
                No friends yet. Share your code above and add a friend to start competing.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Your stats row */}
              <div
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{
                  borderColor: "var(--color-accent)",
                  backgroundColor: "color-mix(in oklab, var(--color-accent) 6%, transparent)",
                }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: "var(--color-accent)", color: "var(--color-paper)" }}>
                  You
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>You</div>
                  <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                    {myWeekPrayed} this week · {myComplete} complete days
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-lg font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
                    <Flame className="h-4 w-4" /> {myStreak}
                  </div>
                  <div className="text-[9px]" style={{ color: "var(--color-ink-muted)" }}>day streak</div>
                </div>
              </div>

              {/* Friend rows */}
              {friends.map((friend, idx) => {
                const imWinning = myStreak >= friend.streak;
                return (
                  <div
                    key={friend.id}
                    className="group relative flex items-center gap-3 rounded-xl border p-3"
                    style={{ borderColor: "var(--color-paper-3)" }}
                  >
                    {/* Rank badge */}
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: idx === 0 ? "color-mix(in oklab, var(--color-warmth) 20%, transparent)" : "var(--color-paper-2)",
                        color: idx === 0 ? "var(--color-warmth)" : "var(--color-ink-muted)",
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
                        {friend.firstName || friend.displayName || "Friend"}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                        {friend.thisWeekPrayed} this week · {friend.totalCompleteDays} complete · {friend.masjidPct}% masjid
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-lg font-bold tabular-nums" style={{ color: imWinning ? "var(--color-ink-soft)" : "var(--color-warmth)" }}>
                        <Flame className="h-4 w-4" /> {friend.streak}
                      </div>
                      <div className="text-[9px]" style={{ color: "var(--color-ink-muted)" }}>day streak</div>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="absolute right-1.5 top-1.5 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Remove friend"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-3 sm:p-4"
      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums sm:text-xl" style={{ color: "var(--color-ink)" }}>
          {value}
        </span>
        <span className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>{sub}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-bold tabular-nums" style={{ color: "var(--color-ink)" }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>{label}</div>
    </div>
  );
}
