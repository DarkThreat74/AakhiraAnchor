"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogOut, RefreshCw } from "lucide-react";

type Tab = "overview" | "lessons" | "dhikr" | "huddle" | "talks";

export default function AdminPortal() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{ users: number; lessons: number; dhikr: number; huddleTasks: number; talks: number } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-5 w-5 animate-spin" style={{ color: "var(--color-ink-muted)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-paper-2)" }}>
      {/* Top bar */}
      <header className="border-b" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Waqt Admin</h1>
          <button
            onClick={() => router.push("/admin/login")}
            className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <LogOut className="h-4 w-4" />
            Exit
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <div className="flex gap-1 border-b" style={{ borderColor: "var(--color-paper-3)" }}>
          <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabButton>
          <TabButton active={tab === "lessons"} onClick={() => setTab("lessons")}>Lessons</TabButton>
          <TabButton active={tab === "dhikr"} onClick={() => setTab("dhikr")}>Dhikr</TabButton>
          <TabButton active={tab === "huddle"} onClick={() => setTab("huddle")}>Huddle Tasks</TabButton>
          <TabButton active={tab === "talks"} onClick={() => setTab("talks")}>Talks</TabButton>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {tab === "overview" && <Overview stats={stats} />}
        {tab === "lessons" && <LessonsManager />}
        {tab === "dhikr" && <DhikrManager />}
        {tab === "huddle" && <HuddleManager />}
        {tab === "talks" && <TalksManager />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm font-medium transition-colors"
      style={{
        color: active ? "var(--color-ink)" : "var(--color-ink-muted)",
        borderBottom: active ? "2px solid var(--color-accent)" : "2px solid transparent",
        marginBottom: "-1px",
      }}
    >
      {children}
    </button>
  );
}

function Overview({ stats }: { stats: { users: number; lessons: number; dhikr: number; huddleTasks: number; talks: number } | null }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      <StatCard label="Users" value={stats?.users ?? 0} />
      <StatCard label="Lessons" value={stats?.lessons ?? 0} />
      <StatCard label="Dhikr Sequences" value={stats?.dhikr ?? 0} />
      <StatCard label="Huddle Tasks" value={stats?.huddleTasks ?? 0} />
      <StatCard label="Talks" value={stats?.talks ?? 0} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>{value}</p>
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
    <div className="flex flex-col gap-6">
      <AddForm title="Add Daily Lesson" onSubmit={add} error={error}>
        <Field label="Content" value={content} onChange={setContent} textarea />
        <Field label="Source Citation" value={source} onChange={setSource} placeholder="e.g. Sahih Bukhari 1:2:7" />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No lessons yet. Add your first curated lesson above.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <p className="text-sm" style={{ color: "var(--color-ink)" }}>{item.content}</p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>Source: {item.sourceCitation}{item.category ? ` · ${item.category}` : ""}</p>
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
    <div className="flex flex-col gap-6">
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
            <p className="text-lg" style={{ color: "var(--color-ink)" }}>{item.phraseArabic}</p>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{item.phraseTransliteration} · {item.targetCount}x · order {item.sequenceOrder}</p>
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
    <div className="flex flex-col gap-6">
      <AddForm title="Add Huddle Task" onSubmit={add} error={error}>
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Available in free tier
        </label>
      </AddForm>

      <ItemList loading={loading} items={items} empty="No huddle tasks yet.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>{item.title}</p>
            <p className="text-xs" style={{ color: "var(--color-ink-muted)" }}>
              {item.category ? `${item.category} · ` : ""}{item.isDefaultFree ? "Free tier" : "Plus only"}
            </p>
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
    <div className="flex flex-col gap-6">
      <AddForm title="Add Talk (external link)" onSubmit={add} error={error}>
        <Field label="Title" value={title} onChange={setTitle} />
        <Field label="Speaker (optional)" value={speaker} onChange={setSpeaker} />
        <Field label="Category (optional)" value={category} onChange={setCategory} />
        <Field label="External URL" value={url} onChange={setUrl} placeholder="https://youtube.com/..." />
      </AddForm>

      <ItemList loading={loading} items={items} empty="No talks yet.">
        {(item) => (
          <div className="flex flex-col gap-1">
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
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
    <form onSubmit={onSubmit} className="rounded-lg border p-5 flex flex-col gap-3" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{title}</h2>
      {children}
      {error && <p className="text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
      <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
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
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: "var(--color-ink-muted)" }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)", color: "var(--color-ink)" }}
        />
      )}
    </div>
  );
}

function ItemList<T extends { id: string }>({ loading, items, empty, children }: {
  loading: boolean; items: T[]; empty: string; children: (item: T) => React.ReactNode;
}) {
  if (loading) {
    return <div className="py-8 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</div>;
  }
  if (items.length === 0) {
    return <div className="py-8 text-center text-sm" style={{ color: "var(--color-ink-muted)" }}>{empty}</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-4" style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}>
          {children(item)}
        </div>
      ))}
    </div>
  );
}
