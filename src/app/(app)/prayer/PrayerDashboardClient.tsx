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
  totalOwed: number;
  onboardingEstimate: number;
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
  const [qadaaAdjust, setQadaaAdjust] = useState(1);
  const [qadaaMsg, setQadaaMsg] = useState<string | null>(null);

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

  async function handleQadaaAdjust(delta: number) {
    try {
      const res = await fetch("/api/qadaa/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: delta }),
      });
      if (res.ok) {
        const data = await res.json();
        setQadaa(data);
        setQadaaMsg(delta > 0 ? `Added ${delta} qadaa.` : `Logged ${Math.abs(delta)} qadaa.`);
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
      {qadaa && (
        <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Qadaa Tracker</h2>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Prayers owed</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-warmth)" }}>
                {qadaa.totalOwed}
              </span>
            </div>
            {qadaaMsg && (
              <div className="mb-3 text-xs font-medium" style={{ color: "var(--color-success)" }}>
                {qadaaMsg}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQadaaAdjust(Math.max(1, qadaaAdjust - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
                >
                  -
                </button>
                <input
                  type="number"
                  value={qadaaAdjust}
                  onChange={(e) => setQadaaAdjust(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-12 rounded-lg border px-2 py-1 text-center text-sm tabular-nums"
                  style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
                />
                <button
                  onClick={() => setQadaaAdjust(Math.min(20, qadaaAdjust + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm"
                  style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => handleQadaaAdjust(-qadaaAdjust)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ borderColor: "var(--color-success)", color: "var(--color-success)" }}
              >
                Log prayed
              </button>
              <button
                onClick={() => handleQadaaAdjust(qadaaAdjust)}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
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

      {/* Friends section */}
      <div className="mb-6 rounded-2xl border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--color-paper-3)" }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
            <Users className="h-4 w-4" /> Prayer Friends
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

          {/* Friends list */}
          {friends.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              No friends added yet. Add a friend with their prayer code to compare streaks.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Your row */}
              <div
                className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                style={{ borderColor: "var(--color-accent)", backgroundColor: "color-mix(in oklab, var(--color-accent) 5%, transparent)" }}
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>You</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{analytics?.totalCompleteDays || 0} complete</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-accent)" }}>
                    {analytics?.streak || 0} 🔥
                  </span>
                </div>
              </div>

              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                  style={{ borderColor: "var(--color-paper-3)" }}
                >
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4" style={{ color: "var(--color-warmth)" }} />
                    <span className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
                      {friend.firstName || friend.displayName || "Friend"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{friend.totalCompleteDays} complete</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: "var(--color-warmth)" }}>
                      {friend.streak} 🔥
                    </span>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-xs transition-colors"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
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
