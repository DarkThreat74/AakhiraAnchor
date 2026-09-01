// Shared event color palette — used by DayView, MonthView, and PublicCalendar.
// 16 visually distinct colors spanning the full hue wheel with varied saturation
// and lightness so they remain distinguishable side-by-side and accessible on
// both light and dark surfaces.

export interface EventColor {
  label: string;
  value: string;
}

export const EVENT_COLORS: EventColor[] = [
  { label: "Teal", value: "#0e7490" },
  { label: "Burnt Orange", value: "#c2410c" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#be185d" },
  { label: "Forest Green", value: "#15803d" },
  { label: "Amber", value: "#b45309" },
  { label: "Royal Blue", value: "#1e40af" },
  { label: "Crimson", value: "#9f1239" },
  { label: "Indigo", value: "#4338ca" },
  { label: "Mustard", value: "#a16207" },
  { label: "Magenta", value: "#a21caf" },
  { label: "Pine", value: "#166534" },
  { label: "Rust", value: "#7c2d12" },
  { label: "Slate Blue", value: "#3730a3" },
  { label: "Plum", value: "#86198f" },
  { label: "Olive", value: "#4d7c0f" },
];

// Deterministic color assignment for reminders WITHOUT a user-chosen color.
// Used only as a fallback when event.color is null/undefined.
const FALLBACK_REMINDER_COLORS = EVENT_COLORS.slice(0, 8).map((c) => c.value);

export function getReminderColor(title: string, chosenColor?: string | null): string {
  if (chosenColor && chosenColor.length >= 4) return chosenColor;
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_REMINDER_COLORS[Math.abs(hash) % FALLBACK_REMINDER_COLORS.length];
}
