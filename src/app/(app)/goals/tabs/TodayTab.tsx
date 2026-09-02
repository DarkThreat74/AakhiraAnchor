"use client";

import { useMemo } from "react";
import { Target, BookOpen, CheckCircle2, Repeat, ChevronRight } from "lucide-react";
import type { Goal, Homework, Habit, HabitLog } from "@/lib/db/schema";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date | string, b: Date): boolean {
  const d = typeof a === "string" ? new Date(a) : a;
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
}

export default function TodayTab({
  goals,
  homework,
  habits,
  habitLogs,
  onNavigate,
}: {
  goals: Goal[];
  homework: Homework[];
  habits: Habit[];
  habitLogs: HabitLog[];
  onNavigate: (tab: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = todayStr();

  const todaysHomework = useMemo(
    () => homework
      .filter((h) => h.status === "pending" && h.dueDate && isSameDay(h.dueDate, today))
      .sort((a, b) => {
        const aTime = a.dueTime || "23:59";
        const bTime = b.dueTime || "23:59";
        return aTime.localeCompare(bTime);
      }),
    [homework, today],
  );

  const overdueHomework = useMemo(
    () => homework
      .filter((h) => h.status === "pending" && h.dueDate && new Date(h.dueDate) < today && !isSameDay(h.dueDate, today))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [homework, today],
  );

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active").slice(0, 5),
    [goals],
  );

  const habitsCompletedToday = useMemo(() => {
    const map = new Set<string>();
    for (const log of habitLogs) {
      if (log.date === todayDateStr) map.add(log.habitId);
    }
    return map;
  }, [habitLogs, todayDateStr]);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const habitsDone = activeHabits.filter((h) => habitsCompletedToday.has(h.id)).length;

  const completedTodayHomework = useMemo(
    () => homework.filter((h) => h.status === "completed" && h.completedAt && isSameDay(h.completedAt, today)).length,
    [homework, today],
  );

  const totalDueToday = todaysHomework.length + overdueHomework.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--color-ink)" }}>
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
          {totalDueToday === 0 ? "Nothing urgent today" : `${totalDueToday} item${totalDueToday > 1 ? "s" : ""} need attention`}
        </p>
      </div>

      {/* Overdue homework */}
      {overdueHomework.length > 0 && (
        <Section
          icon={<BookOpen className="h-4 w-4" />}
          title="Overdue"
          count={overdueHomework.length}
          accent="var(--color-error)"
          onMore={() => onNavigate("homework")}
        >
          {overdueHomework.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "color-mix(in oklab, var(--color-error) 8%, var(--color-paper))" }}>
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: "var(--color-error)" }} />
              <span className="text-sm truncate flex-1" style={{ color: "var(--color-ink)" }}>{h.title}</span>
              <span className="text-xs shrink-0" style={{ color: "var(--color-error)" }}>
                {new Date(h.dueDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* Today's homework */}
      <Section
        icon={<BookOpen className="h-4 w-4" />}
        title="Due today"
        count={todaysHomework.length}
        onMore={() => onNavigate("homework")}
      >
        {todaysHomework.length === 0 ? (
          <EmptyRow icon={<CheckCircle2 className="h-4 w-4" />} text="Nothing due today" />
        ) : (
          todaysHomework.slice(0, 5).map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[var(--color-paper-2)] transition-colors">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: h.priority === "high" ? "var(--color-error)" : h.priority === "medium" ? "var(--color-accent)" : "var(--color-paper-3)" }} />
              <span className="text-sm truncate flex-1" style={{ color: "var(--color-ink)" }}>{h.title}</span>
              {h.dueTime && <span className="text-xs shrink-0" style={{ color: "var(--color-ink-muted)" }}>{h.dueTime}</span>}
            </div>
          ))
        )}
      </Section>

      {/* Active goals */}
      <Section
        icon={<Target className="h-4 w-4" />}
        title="Active goals"
        count={activeGoals.length}
        onMore={() => onNavigate("long_term")}
      >
        {activeGoals.length === 0 ? (
          <EmptyRow icon={<Target className="h-4 w-4" />} text="No active goals" />
        ) : (
          activeGoals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-[var(--color-paper-2)] transition-colors">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: g.color || "var(--color-accent)" }} />
              <span className="text-sm truncate flex-1" style={{ color: "var(--color-ink)" }}>{g.title}</span>
              <span className="text-xs shrink-0 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--color-paper-2)", color: "var(--color-ink-muted)" }}>
                {g.goalType === "long_term" ? "long" : "short"}
              </span>
            </div>
          ))
        )}
      </Section>

      {/* Habits */}
      <Section
        icon={<Repeat className="h-4 w-4" />}
        title="Habits"
        count={activeHabits.length}
        onMore={() => onNavigate("habits")}
      >
        {activeHabits.length === 0 ? (
          <EmptyRow icon={<Repeat className="h-4 w-4" />} text="No habits yet" />
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            <div className="flex-1">
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-paper-2)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${activeHabits.length > 0 ? (habitsDone / activeHabits.length) * 100 : 0}%`,
                    backgroundColor: "var(--color-accent)",
                  }}
                />
              </div>
            </div>
            <span className="text-xs shrink-0" style={{ color: "var(--color-ink-muted)" }}>
              {habitsDone}/{activeHabits.length} today
            </span>
          </div>
        )}
      </Section>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <SummaryCard label="Completed today" value={completedTodayHomework} icon={<CheckCircle2 className="h-4 w-4" />} />
        <SummaryCard label="Habits done" value={`${habitsDone}/${activeHabits.length}`} icon={<Repeat className="h-4 w-4" />} />
      </div>
    </div>
  );
}

function Section({
  icon, title, count, onMore, children, accent,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  onMore: () => void;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: accent || "var(--color-ink-muted)" }}>{icon}</span>
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{title}</h2>
          {count > 0 && <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{count}</span>}
        </div>
        <button onClick={onMore} className="flex items-center gap-0.5 text-xs transition-colors hover:opacity-70" style={{ color: "var(--color-ink-muted)" }}>
          More <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function EmptyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ color: "var(--color-ink-muted)" }}>
      <span className="opacity-40">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-3" style={{ borderColor: "var(--color-paper-3)" }}>
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--color-ink-muted)" }}>{icon}</span>
        <span className="text-xs" style={{ color: "var(--color-ink-muted)" }}>{label}</span>
      </div>
      <span className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>{value}</span>
    </div>
  );
}
