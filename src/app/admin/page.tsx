"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, ShieldCheck, Mic, LayoutGrid, Users, ChevronRight, ArrowLeft, Heart } from "lucide-react";

type Tab = "overview" | "users" | "talks" | "dhikr";

const NAV_ITEMS: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "users", label: "Users", icon: Users },
  { key: "talks", label: "Talks", icon: Mic },
  { key: "dhikr", label: "Dhikr", icon: Heart },
];

interface AdminStats {
  users: number;
  talks: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  displayName: string | null;
  createdAt: string;
  role: string;
  prayerLogCount: number;
  prayedCount: number;
  lastCheckin: string | null;
  eventCount: number;
  friendCount: number;
}

export default function AdminPortal() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/admin/login");
          return null;
        }
        return r.json().catch(() => null);
      })
      .then((data) => {
        if (data) {
          setStats(data);
          setAuthChecked(true);
        }
      })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-paper-2)" }}>
        <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh overflow-x-clip" style={{ backgroundColor: "var(--color-paper-2)" }}>
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 hidden w-60 flex-col border-r lg:flex"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--color-ink)" }}
          >
            <ShieldCheck className="h-4 w-4" style={{ color: "var(--color-paper)" }} />
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
            Waqt <span style={{ color: "var(--color-ink-muted)" }}>Admin</span>
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.key}
              active={tab === item.key}
              onClick={() => { setTab(item.key); setSelectedUser(null); }}
              icon={item.icon}
            >
              {item.label}
            </NavButton>
          ))}
        </nav>

        <div className="border-t px-3 py-4" style={{ borderColor: "var(--color-paper-3)" }}>
          <button
            onClick={() => router.push("/admin/login")}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[var(--color-paper-2)]"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <LogOut className="h-4 w-4" />
            Exit
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b px-5 py-3 lg:hidden backdrop-blur-md"
        style={{
          borderColor: "var(--color-paper-3)",
          backgroundColor: "color-mix(in oklab, var(--color-paper) 92%, transparent)",
          paddingTop: "calc(0.75rem + env(safe-area-inset-top))",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: "var(--color-ink)" }}
          >
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--color-paper)" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-soft)" }}
        >
          Menu
        </button>
      </header>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 40%, transparent)" }}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r"
            style={{
              borderColor: "var(--color-paper-3)",
              backgroundColor: "var(--color-paper)",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Sections</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-sm"
                style={{ color: "var(--color-ink-muted)" }}
              >
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-3">
              {NAV_ITEMS.map((item) => (
                <NavButton
                  key={item.key}
                  active={tab === item.key}
                  onClick={() => { setTab(item.key); setSidebarOpen(false); setSelectedUser(null); }}
                  icon={item.icon}
                >
                  {item.label}
                </NavButton>
              ))}
            </nav>
            <div className="border-t px-3 py-4" style={{ borderColor: "var(--color-paper-3)" }}>
              <button
                onClick={() => router.push("/admin/login")}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm"
                style={{ color: "var(--color-ink-muted)" }}
              >
                <LogOut className="h-4 w-4" />
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col lg:pl-60">
        <main className="flex-1 px-5 pb-10 pt-16 sm:px-8 lg:px-10 lg:pt-10">
          {/* Section header */}
          <div className="mb-8 max-w-4xl">
            <h1
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ color: "var(--color-ink)" }}
            >
              {selectedUser ? "User Details" : NAV_ITEMS.find((n) => n.key === tab)?.label}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {selectedUser
                ? `${selectedUser.firstName || selectedUser.displayName || selectedUser.email}`
                : tab === "overview" && "Platform summary."
              }
              {tab === "users" && !selectedUser && "All registered accounts. Click any user for details."}
              {tab === "talks" && "External talk links. No self-hosted audio — curation and linking only."}
              {tab === "dhikr" && "Curated dhikr sequences for the tasbih counter. Human-curated from authenticated sources only."}
            </p>
          </div>

          <div className="max-w-4xl">
            {tab === "overview" && <Overview stats={stats} onUsersClick={() => setTab("users")} />}
            {tab === "users" && (selectedUser
              ? <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />
              : <UsersList onSelect={setSelectedUser} />
            )}
            {tab === "talks" && <TalksManager />}
            {tab === "dhikr" && <DhikrManager />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Nav button ───

function NavButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: active ? "var(--color-ink)" : "var(--color-ink-muted)",
        backgroundColor: active ? "var(--color-accent-faint)" : "transparent",
      }}
    >
      <Icon className="h-4 w-4" style={{ color: active ? "var(--color-accent)" : "var(--color-ink-muted)" }} />
      {children}
    </button>
  );
}

// ─── Overview ───

function Overview({ stats, onUsersClick }: { stats: AdminStats | null; onUsersClick: () => void }) {
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
      {/* Users — clickable */}
      <button
        onClick={onUsersClick}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-paper-2)]"
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Users</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>Total registered accounts — click to view all</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>
            {stats?.users ?? 0}
          </p>
          <ChevronRight className="h-4 w-4" style={{ color: "var(--color-ink-muted)" }} />
        </div>
      </button>

      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderTop: "1px solid var(--color-paper-3)" }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>Talks</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>External link entries</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>
          {stats?.talks ?? 0}
        </p>
      </div>
    </div>
  );
}

// ─── Users List ───

function UsersList({ onSelect }: { onSelect: (user: AdminUser) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data.users) setUsers(data.users);
        else if (data.error) setError(data.error);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm" style={{ color: "var(--color-warmth)" }}>{error}</p>;
  }

  if (users.length === 0) {
    return <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>No users registered yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
      {users.map((user, i) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[var(--color-paper-2)]"
          style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-paper-3)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              {user.firstName || user.displayName || "No name set"}
            </p>
            <p className="mt-0.5 truncate text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {user.email}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-medium tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                {user.prayedCount} prayed
              </p>
              <p className="text-[10px]" style={{ color: "var(--color-ink-muted)" }}>
                {user.eventCount} events · {user.friendCount} friends
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--color-ink-muted)" }} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── User Detail ───

function UserDetail({ user, onBack }: { user: AdminUser; onBack: () => void }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Email", value: user.email },
    { label: "Display Name", value: user.displayName || "Not set" },
    { label: "First Name", value: user.firstName || "Not set" },
    { label: "User ID", value: user.id },
    { label: "Joined", value: new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
    { label: "Last Prayer Check-in", value: user.lastCheckin ? new Date(user.lastCheckin).toLocaleString("en-US") : "Never" },
  ];

  const stats: Array<{ label: string; value: number }> = [
    { label: "Total Prayer Logs", value: user.prayerLogCount },
    { label: "Prayers Marked as Prayed", value: user.prayedCount },
    { label: "Calendar Events", value: user.eventCount },
    { label: "Friends Added", value: user.friendCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: "var(--color-ink-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </button>

      {/* User info */}
      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
            style={{ borderTop: i === 0 ? "none" : "1px solid var(--color-paper-3)" }}
          >
            <span className="shrink-0 text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>
              {row.label}
            </span>
            <span className="truncate text-sm text-right" style={{ color: "var(--color-ink)" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Activity stats */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
          Activity
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
            >
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-ink)" }}>
                {stat.value}
              </p>
              <p className="mt-1 text-[11px] leading-tight" style={{ color: "var(--color-ink-muted)" }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Talks Manager ───

function TalksManager() {
  const [items, setItems] = useState<Array<{ id: string; title: string; speaker: string | null; category: string | null; externalUrl: string }>>([]);
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/talks")
      .then(r => r.json().catch(() => []))
      .then(setItems)
      .catch(() => { /* ignore — loading will be cleared in finally */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !url.trim()) { setError("Title and URL are required."); return; }
    const res = await fetch("/api/admin/talks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, speaker: speaker || undefined, category: category || undefined, externalUrl: url }),
    });
    if (res.ok) { setTitle(""); setSpeaker(""); setCategory(""); setUrl(""); load(); }
    else { setError("Failed to add talk."); }
  }

  return (
    <div className="flex flex-col gap-8">
      <AddForm title="Add Talk (external link)" onSubmit={add} error={error}>
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Speaker (optional)" value={speaker} onChange={setSpeaker} />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
        <Field label="External URL" value={url} onChange={setUrl} placeholder="https://youtube.com/..." />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No talks yet.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: "var(--color-accent)" }}
            >
              {item.title}
            </a>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {item.speaker ? `${item.speaker} · ` : ""}{item.category ? `${item.category} · ` : ""}{item.externalUrl}
            </p>
          </div>
        )}
      </ItemList>
    </div>
  );
}

// ─── Dhikr Manager ───

function DhikrManager() {
  const [items, setItems] = useState<Array<{ id: string; phraseArabic: string; phraseTransliteration: string; targetCount: number; sequenceOrder: number; sourceCitation: string }>>([]);
  const [arabic, setArabic] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [targetCount, setTargetCount] = useState("33");
  const [order, setOrder] = useState("0");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/dhikr")
      .then(r => r.json().catch(() => []))
      .then(setItems)
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!arabic.trim() || !transliteration.trim() || !source.trim()) {
      setError("Arabic phrase, transliteration, and source citation are required.");
      return;
    }
    const res = await fetch("/api/admin/dhikr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phraseArabic: arabic,
        phraseTransliteration: transliteration,
        targetCount: parseInt(targetCount) || 1,
        sequenceOrder: parseInt(order) || 0,
        sourceCitation: source,
      }),
    });
    if (res.ok) {
      setArabic(""); setTransliteration(""); setTargetCount("33"); setOrder("0"); setSource("");
      load();
    } else {
      setError("Failed to add dhikr sequence.");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <AddForm title="Add Dhikr Sequence" onSubmit={add} error={error}>
        <Field label="Arabic phrase" value={arabic} onChange={setArabic} placeholder="سُبْحَانَ اللَّهِ" />
        <Field label="Transliteration" value={transliteration} onChange={setTransliteration} placeholder="Subhanallah" />
        <Field label="Target count" value={targetCount} onChange={setTargetCount} type="number" />
        <Field label="Sequence order" value={order} onChange={setOrder} type="number" />
        <Field label="Source citation" value={source} onChange={setSource} placeholder="Sahih al-Bukhari ..." textarea />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No dhikr sequences yet.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              <span style={{ fontFamily: "var(--font-amiri, serif)" }}>{item.phraseArabic}</span>
              {" — "}{item.phraseTransliteration}
            </p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {item.targetCount}× · order {item.sequenceOrder} · {item.sourceCitation}
            </p>
          </div>
        )}
      </ItemList>
    </div>
  );
}

// ─── Shared UI components ───

function AddForm({ title, onSubmit, error, children }: { title: string; onSubmit: (e: React.FormEvent) => void; error: string | null; children: React.ReactNode }) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-lg border p-5 sm:p-6"
      style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
        {title}
      </h2>
      {children}
      {error && <p className="text-xs" style={{ color: "var(--color-warmth)" }}>{error}</p>}
      <button
        type="submit"
        className="self-start rounded-md px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
      >
        Add
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
        />
      )}
    </label>
  );
}

function ItemList<T>({ loading, items, empty, children }: { loading: boolean; items: T[]; empty: string; children: (item: T) => React.ReactNode }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>{empty}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-md border p-4"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
        >
          {children(item)}
        </div>
      ))}
    </div>
  );
}

