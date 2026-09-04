"use client";

import { useState, useCallback } from "react";
import { ArrowLeftRight, Moon } from "lucide-react";

function toHijri(date: Date): { day: number; month: string; year: number; formatted: string } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const formatted = formatter.format(date);
    const parts = formatter.formatToParts(date);
    const day = parseInt(parts.find((p) => p.type === "day")?.value || "0");
    const month = parts.find((p) => p.type === "month")?.value || "";
    const year = parseInt(parts.find((p) => p.type === "year")?.value || "0");
    return { day, month, year, formatted };
  } catch {
    return { day: 0, month: "", year: 0, formatted: "Unavailable" };
  }
}

function toGregorian(date: Date): { formatted: string } {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    return { formatted };
  } catch {
    return { formatted: "Unavailable" };
  }
}

function dateInputStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
];

export default function HijriConverterClient() {
  const [selectedDate, setSelectedDate] = useState(() => dateInputStr(new Date()));
  const [hijriMonth, setHijriMonth] = useState(0);
  const [hijriYear, setHijriYear] = useState(1447);
  const [hijriDay, setHijriDay] = useState(1);

  const dateObj = new Date(selectedDate + "T00:00:00");
  const hijri = toHijri(dateObj);
  const gregorian = toGregorian(dateObj);

  // Reverse conversion: approximate Hijri -> Gregorian using Intl
  // We iterate through Gregorian dates to find one that matches the target Hijri
  const reverseConvert = useCallback(() => {
    // Approximate: Hijri year is ~11 days shorter than Gregorian
    // Start from an approximate Gregorian date and search
    const approxGregYear = Math.round(hijriYear * 1.0307 + 622);

    // Search within a reasonable window
    const start = new Date(approxGregYear, 0, 1);
    const end = new Date(approxGregYear + 1, 11, 31);
    const cur = new Date(start);

    while (cur <= end) {
      const h = toHijri(cur);
      if (h.year === hijriYear && h.month === HIJRI_MONTHS[hijriMonth] && h.day === hijriDay) {
        return toGregorian(cur);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { formatted: "Not found" };
  }, [hijriDay, hijriMonth, hijriYear]);

  const reverseResult = reverseConvert();

  return (
    <div className="mx-auto max-w-md">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ color: "var(--color-ink)" }}>Hijri Converter</h1>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-ink-muted)" }}>
          Convert between Gregorian and Hijri dates
        </p>
      </div>

      {/* ── Gregorian → Hijri ── */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--color-paper-3)" }}>
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Gregorian to Hijri</h2>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--color-ink-soft)" }}>
              Select a date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 44 }}
            />
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-accent) 6%, var(--color-paper-2))" }}
          >
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
              {gregorian.formatted}
            </p>
            <p className="mt-2 text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
              {hijri.formatted}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
              AH
            </p>
          </div>
        </div>
      </div>

      {/* ── Hijri → Gregorian ── */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper)" }}
      >
        <div className="border-b px-5 py-3" style={{ borderColor: "var(--color-paper-3)" }}>
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" style={{ color: "var(--color-ink-soft)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-ink)" }}>Hijri to Gregorian</h2>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--color-ink-muted)" }}>Day</label>
              <input
                type="number"
                min="1"
                max="30"
                value={hijriDay}
                onChange={(e) => setHijriDay(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                className="w-full rounded-lg border px-2 py-2 text-sm tabular-nums outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--color-ink-muted)" }}>Month</label>
              <select
                value={hijriMonth}
                onChange={(e) => setHijriMonth(parseInt(e.target.value))}
                className="w-full rounded-lg border px-2 py-2 text-xs outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
              >
                {HIJRI_MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--color-ink-muted)" }}>Year</label>
              <input
                type="number"
                min="1"
                max="2000"
                value={hijriYear}
                onChange={(e) => setHijriYear(Math.max(1, Math.min(2000, parseInt(e.target.value) || 1)))}
                className="w-full rounded-lg border px-2 py-2 text-sm tabular-nums outline-none"
                style={{ borderColor: "var(--color-paper-3)", backgroundColor: "var(--color-paper-2)", color: "var(--color-ink)", minHeight: 40 }}
              />
            </div>
          </div>
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-ink) 5%, var(--color-paper-2))" }}
          >
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-ink-muted)" }}>
              {hijriDay} {HIJRI_MONTHS[hijriMonth]} {hijriYear} AH
            </p>
            <p className="mt-2 text-lg font-bold" style={{ color: "var(--color-ink)" }}>
              {reverseResult.formatted}
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px]" style={{ color: "var(--color-ink-muted)" }}>
        Hijri dates are calculated using the Umm al-Qura calendar. Actual sighting may vary by one day.
      </p>
    </div>
  );
}
