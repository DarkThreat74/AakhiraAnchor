"use client";

import { useState, useEffect } from "react";
import { Flame, TrendingUp, MapPin, Clock, Users, UserPlus, Copy, Check } from "lucide-react";

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
}

interface Friend {
  id: string;
  firstName: string | null;
  displayName: string | null;
  streak: number;
  totalCompleteDays: number;
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

export default function PrayerDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [prayerCode, setPrayerCode] = useState<string | null>(null);
  const [qadaa, setQadaa] = useState<QadaaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [addFriendCode, setAddFriendCode] = useState("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qadaaMsg, setQadaaMsg] = useState<string | null>(null);
  // Qadaa setup form state
  const [setupFajr, setSetupFajr] = useState(0);
  const [setupDhuhr, setSetupDhuhr] = useState(0);
  const [setupAsr, setSetupAsr] = useState(0);
  const [setupMaghrib, setSetupMaghrib] = useState(0);
  const [setupIsha, setSetupIsha] = useState(0);
  const [qadaaSetting, setQadaaSetting] = useState(false);
  // Qadaa adjust state
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
    try {
      const res = await fetch("/api/prayer-friends/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: addFriendCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriends([...friends, data.friend]);
        setFriendSuccess(`Added ${data.friend.firstName || data.friend.displayName || "friend"}!`);
        setAddFriendCode("");
        setTimeout(() => setFriendSuccess(null), 3000);
      } else {
        setFriendError(data.error || "Failed to add friend.");
      }
    } catch {
      setFriendError("Network error.");
    }
  }

  async function handleRemoveFriend(friendId: string) {
    try {
      const res = await fetch(`/api/prayer-friends/remove?friendId=${friendId}`, { method: "DELETE" });
      if (res.ok) {
        setFriends(friends.filter((f) => f.id !== friendId));
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
      if (res.ok) {
        setQadaa(data);
        setQadaaMsg("Qadaa set up successfully.");
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
        setQadaa(data);
        setQadaaMsg(delta > 0
          ? `Added ${delta} to ${PRAYER_LABELS[adjustPrayer]} qadaa.`
          : `Logged ${Math.abs(delta)} ${PRAYER_LABELS[adjustPrayer]} qadaa as prayed.`);
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: "var(--color-ink)" }}>
        Prayer Dashboard
      </h1>

      {/* Streak + overview cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Streak"
          value={`${analytics?.streak || 0} days`}
          color="var(--color-warmth)"
        />
        <StatCard
          icon={<Check className="h-4 w-4" />}
          label="Complete Days"
          value={`${analytics?.totalCompleteDays || 0}`}
          color="var(--color-success)"
        />
        <StatCard
          icon={<MapPin className="h-4 w-4" />}
          label="Masjid %"
          value={`${analytics?.masjidPct || 0}%`}
          color="var(--color-accent)"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Total Prayed"
          value={`${analytics?.totalPrayed || 0}`}
          color="var(--color-ink-soft)"
        />
      </div>

      {/* Per-prayer analytics */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Per Prayer (last 90 days)</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--color-paper-3)" }}>
          {analytics?.perPrayer.map((stat) => (
            <div key={stat.prayer} className="flex items-center justify-between px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                  {PRAYER_LABELS[stat.prayer] || stat.prayer}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs sm:gap-6">
                <div className="flex items-center gap-1" style={{ color: "var(--color-ink-muted)" }}>
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{stat.avgTimeStr || "—"}</span>
                </div>
                <div className="text-center">
                  <div className="font-medium tabular-nums" style={{ color: "var(--color-ink)" }}>{stat.consistencyPct}%</div>
                  <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>consistency</div>
                </div>
                <div className="text-center">
                  <div className="font-medium tabular-nums" style={{ color: "var(--color-accent)" }}>{stat.masjidPct}%</div>
                  <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>masjid</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Qadaa section */}
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
            {/* Per-salah breakdown */}
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

            {/* Total */}
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

            {/* Adjust controls */}
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

      {/* Prayer code sharing */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Your Prayer Code</h2>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <p className="mb-3 text-xs" style={{ color: "var(--color-ink-muted)" }}>
            Share this code with friends so they can see your prayer streaks and you can compete together.
          </p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-lg border px-3 py-2 text-center text-lg font-bold tracking-widest"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
            >
              {prayerCode || "—"}
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
            >
              {copied ? <Check className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Friends competition section */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            <Users className="h-4 w-4" /> Prayer Competition
          </h2>
        </div>
        <div className="px-4 py-4 sm:px-5">
          {/* Add friend */}
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={addFriendCode}
                onChange={(e) => setAddFriendCode(e.target.value)}
                placeholder="Enter friend's code"
                maxLength={6}
                className="flex-1 rounded-lg border px-3 py-2 text-sm uppercase tracking-widest"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
              />
              <button
                onClick={handleAddFriend}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)" }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {friendError && <p className="mt-2 text-xs" style={{ color: "var(--color-warmth)" }}>{friendError}</p>}
            {friendSuccess && <p className="mt-2 text-xs" style={{ color: "var(--color-success)" }}>{friendSuccess}</p>}
          </div>

          {/* Side-by-side comparison */}
          {friends.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              No friends added yet. Add a friend with their prayer code to compete and compare streaks side by side.
            </p>
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => {
                const myStreak = analytics?.streak || 0;
                const myComplete = analytics?.totalCompleteDays || 0;
                const imWinning = myStreak >= friend.streak;
                return (
                  <div key={friend.id} className="rounded-xl border p-3" style={{ borderColor: "var(--color-paper-3)" }}>
                    {/* VS header */}
                    <div className="mb-3 flex items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-ink-muted)" }}>
                        {imWinning ? "You're leading" : `${friend.firstName || friend.displayName || "Friend"} is leading`}
                      </span>
                    </div>

                    {/* Side-by-side stats */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* You */}
                      <div
                        className="rounded-lg border p-3 text-center"
                        style={{
                          borderColor: imWinning ? "var(--color-accent)" : "var(--color-paper-3)",
                          backgroundColor: imWinning ? "color-mix(in oklab, var(--color-accent) 8%, transparent)" : "transparent",
                        }}
                      >
                        <div className="mb-1 text-xs font-medium" style={{ color: "var(--color-ink)" }}>You</div>
                        <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
                          {myStreak}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>day streak</div>
                        <div className="mt-2 text-xs tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                          {myComplete} complete
                        </div>
                      </div>

                      {/* Friend */}
                      <div
                        className="rounded-lg border p-3 text-center"
                        style={{
                          borderColor: !imWinning ? "var(--color-warmth)" : "var(--color-paper-3)",
                          backgroundColor: !imWinning ? "color-mix(in oklab, var(--color-warmth) 8%, transparent)" : "transparent",
                        }}
                      >
                        <div className="mb-1 truncate text-xs font-medium" style={{ color: "var(--color-ink)" }}>
                          {friend.firstName || friend.displayName || "Friend"}
                        </div>
                        <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-warmth)" }}>
                          {friend.streak}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>day streak</div>
                        <div className="mt-2 text-xs tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                          {friend.totalCompleteDays} complete
                        </div>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="mt-3 w-full text-center text-[10px] transition-colors"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      Remove friend
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

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl border p-3 sm:p-4"
      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
    >
      <div className="mb-1.5 flex items-center gap-1.5" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums sm:text-xl" style={{ color: "var(--color-ink)" }}>
        {value}
      </div>
    </div>
  );
}
