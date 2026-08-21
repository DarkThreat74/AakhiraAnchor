"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, RefreshCw, ShieldCheck, BookOpen, Heart, ListTodo, Mic, LayoutGrid } from "lucide-react";

type Tab = "overview" | "lessons" | "dhikr" | "huddle" | "talks";

const NAV_ITEMS: Array<{ key: Tab; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "lessons", label: "Lessons", icon: BookOpen },
  { key: "dhikr", label: "Dhikr", icon: Heart },
  { key: "huddle", label: "Huddle Tasks", icon: ListTodo },
  { key: "talks", label: "Talks", icon: Mic },
];

export default function AdminPortal() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{ users: number; lessons: number; dhikr: number; huddleTasks: number; talks: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/admin/login");
          return null;
        }
        return r.json();
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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--color-paper-2)" }}>
        <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-clip" style={{ backgroundColor: "var(--color-paper-2)" }}>
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
              onClick={() => setTab(item.key)}
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
            style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
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
                  onClick={() => { setTab(item.key); setSidebarOpen(false); }}
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
          <div className="mb-8 max-w-3xl">
            <h1
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ color: "var(--color-ink)" }}
            >
              {NAV_ITEMS.find((n) => n.key === tab)?.label}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {tab === "overview" && "Platform summary — user count and content inventory."}
              {tab === "lessons" && "Curated daily lessons. Every entry must cite a human-verified source."}
              {tab === "dhikr" && "Dhikr sequences for the tasbih counter. Arabic + transliteration + source."}
              {tab === "huddle" && "Daily Huddle task pool. Free tier shows is_default_free items only."}
              {tab === "talks" && "External talk links. No self-hosted audio — curation and linking only."}
            </p>
          </div>

          <div className="max-w-3xl">
            {tab === "overview" && <Overview stats={stats} />}
            {tab === "lessons" && <LessonsManager />}
            {tab === "dhikr" && <DhikrManager />}
            {tab === "huddle" && <HuddleManager />}
            {tab === "talks" && <TalksManager />}
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

function Overview({ stats }: { stats: { users: number; lessons: number; dhikr: number; huddleTasks: number; talks: number } | null }) {
  const rows: Array<{ label: string; value: number; note: string }> = [
    { label: "Users", value: stats?.users ?? 0, note: "Total registered accounts" },
    { label: "Daily Lessons", value: stats?.lessons ?? 0, note: "Curated content entries" },
    { label: "Dhikr Sequences", value: stats?.dhikr ?? 0, note: "Tasbih counter sequences" },
    { label: "Huddle Tasks", value: stats?.huddleTasks ?? 0, note: "Task pool (free + plus)" },
    { label: "Talks", value: stats?.talks ?? 0, note: "External link entries" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderTop: i === 0 ? "none" : `1px solid var(--color-paper-3)`,
          }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{row.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>{row.note}</p>
          </div>
          <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--color-ink)" }}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Lessons Manager ───

function LessonsManager() {
  const [items, setItems] = useState<Array<{ id: string; content: string; sourceCitation: string; category: string | null }>>([]);
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/lessons").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim() || !source.trim()) { setError("Content and source are required."); return; }
    const res = await fetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, sourceCitation: source, category: category || undefined }),
    });
    if (res.ok) {
      setContent(""); setSource(""); setCategory("");
      load();
    } else { setError("Failed to add lesson."); }
  }

  return (
    <div className="flex flex-col gap-8">
      <AddForm title="Add Daily Lesson" onSubmit={add} error={error}>
        <Field label="Content" value={content} onChange={setContent} textarea />
        <Field label="Source Citation" value={source} onChange={setSource} placeholder="e.g. Sahih Bukhari 1:2:7" />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No lessons yet. Add your first curated lesson above.">
        {(item) => (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink)" }}>{item.content}</p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              Source: {item.sourceCitation}{item.category ? ` · ${item.category}` : ""}
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
  const [translit, setTranslit] = useState("");
  const [count, setCount] = useState("33");
  const [order, setOrder] = useState("0");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/dhikr").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!arabic.trim() || !translit.trim() || !source.trim()) { setError("All fields except count/order are required."); return; }
    const res = await fetch("/api/admin/dhikr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseArabic: arabic, phraseTransliteration: translit, targetCount: Number(count), sequenceOrder: Number(order), sourceCitation: source }),
    });
    if (res.ok) { setArabic(""); setTranslit(""); setCount("33"); setOrder("0"); setSource(""); load(); }
    else { setError("Failed to add dhikr."); }
  }

  return (
    <div className="flex flex-col gap-8">
      <AddForm title="Add Dhikr Sequence" onSubmit={add} error={error}>
        <Field label="Arabic Phrase" value={arabic} onChange={setArabic} />
        <Field label="Transliteration" value={translit} onChange={setTranslit} placeholder="e.g. SubhanAllah" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target Count" value={count} onChange={setCount} type="number" />
          <Field label="Sequence Order" value={order} onChange={setOrder} type="number" />
        </div>
        <Field label="Source Citation" value={source} onChange={setSource} placeholder="e.g. Sahih Muslim 4:2071" />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No dhikr sequences yet.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <p className="text-lg leading-snug" style={{ color: "var(--color-ink)", fontFamily: "var(--font-arabic)" }}>
              {item.phraseArabic}
            </p>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {item.phraseTransliteration} · {item.targetCount}x · order {item.sequenceOrder}
            </p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Source: {item.sourceCitation}</p>
          </div>
        )}
      </ItemList>
    </div>
  );
}

// ─── Huddle Tasks Manager ───

function HuddleManager() {
  const [items, setItems] = useState<Array<{ id: string; title: string; category: string | null; isDefaultFree: boolean }>>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/admin/huddle-tasks").then(r => r.json()).then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    const res = await fetch("/api/admin/huddle-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category: category || undefined, isDefaultFree: isFree }),
    });
    if (res.ok) { setTitle(""); setCategory(""); setIsFree(false); load(); }
    else { setError("Failed to add task."); }
  }

  return (
    <div className="flex flex-col gap-8">
      <AddForm title="Add Huddle Task" onSubmit={add} error={error}>
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
        <label className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-ink)" }}>
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Available in free tier
        </label>
      </AddForm>

      <ItemList loading={loading} items={items} empty="No huddle tasks yet.">
        {(item) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{item.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
                {item.category ? `${item.category} · ` : ""}{item.isDefaultFree ? "Free tier" : "Plus only"}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: item.isDefaultFree ? "var(--color-accent-faint)" : "var(--color-paper-3)",
                color: item.isDefaultFree ? "var(--color-accent)" : "var(--color-ink-muted)",
              }}
            >
              {item.isDefaultFree ? "Free" : "Plus"}
            </span>
          </div>
        )}
      </ItemList>
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
    fetch("/api/admin/talks").then(r => r.json()).then(setItems).finally(() => setLoading(false));
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
      {error && (
        <p
          className="rounded-md px-3 py-2 text-sm"
          style={{
            color: "var(--color-error)",
            backgroundColor: "color-mix(in oklab, var(--color-error) 8%, transparent)",
          }}
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
      >
        <Plus className="h-4 w-4" />
        Add
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; textarea?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)" }}
        />
      )}
    </div>
  );
}

function ItemList<T extends { id: string }>({ loading, items, empty, children }: {
  loading: boolean; items: T[]; empty: string; children: (item: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>
        Loading...
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed py-12 text-center text-sm"
        style={{ borderColor: "var(--color-paper-3)", color: "var(--color-ink-muted)" }}
      >
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-paper-3)" }}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className="px-5 py-4"
          style={{
            backgroundColor: "var(--color-paper)",
            borderTop: i === 0 ? "none" : `1px solid var(--color-paper-3)`,
          }}
        >
          {children(item)}
        </div>
      ))}
    </div>
  );
}
