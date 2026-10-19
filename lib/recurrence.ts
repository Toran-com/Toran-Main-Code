// Repeating events, kept to the patterns mandirs actually use: weekly,
// fortnightly, and "the first / second / … / last Saturday of the month".
// Stored as a small iCalendar RRULE in events.recurrence, with each actual
// date written to event_occurrences so pages can query by date.

export type Repeat =
  | { kind: "weekly"; interval: 1 | 2 }
  | { kind: "monthly"; week: 1 | 2 | 3 | 4 | -1 }; // -1 = last

import type { ClientKey } from "@/lib/i18n/client-messages";
import { pageLocale, sharedT } from "@/lib/i18n/locale";

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ORDINALS: Record<string, string> = {
  "1": "First",
  "2": "Second",
  "3": "Third",
  "4": "Fourth",
  "-1": "Last",
};

const dateOnly = (value: string) => new Date(`${value}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// Which week of its month a date falls in (1–5), and whether it's the last.
export function weekOfMonth(date: string): { week: number; last: boolean } {
  const d = dateOnly(date);
  const week = Math.floor((d.getUTCDate() - 1) / 7) + 1;
  const last = addDays(d, 7).getUTCMonth() !== d.getUTCMonth();
  return { week, last };
}

export function toRule(
  repeat: Repeat,
  firstDate: string,
  until: string,
): string {
  const day = DAYS[dateOnly(firstDate).getUTCDay()];
  const end = until.replaceAll("-", "");
  if (repeat.kind === "weekly") {
    return `RRULE:FREQ=WEEKLY;INTERVAL=${repeat.interval};BYDAY=${day};UNTIL=${end}`;
  }
  return `RRULE:FREQ=MONTHLY;BYDAY=${repeat.week}${day};UNTIL=${end}`;
}

type Parsed = {
  repeat: Repeat;
  weekday: number;
  until: string;
};

export function parseRule(rule: string): Parsed | null {
  const parts = Object.fromEntries(
    rule
      .replace(/^RRULE:/, "")
      .split(";")
      .map((p) => p.split("=") as [string, string]),
  );
  const untilMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(parts.UNTIL ?? "");
  if (!untilMatch) return null;
  const until = `${untilMatch[1]}-${untilMatch[2]}-${untilMatch[3]}`;
  const byday = /^(-1|[1-4])?(SU|MO|TU|WE|TH|FR|SA)$/.exec(parts.BYDAY ?? "");
  if (!byday) return null;
  const weekday = DAYS.indexOf(byday[2] as (typeof DAYS)[number]);
  if (parts.FREQ === "WEEKLY") {
    const interval = Number(parts.INTERVAL ?? "1");
    if (interval !== 1 && interval !== 2) return null;
    return { repeat: { kind: "weekly", interval }, weekday, until };
  }
  if (parts.FREQ === "MONTHLY" && byday[1]) {
    const week = Number(byday[1]) as 1 | 2 | 3 | 4 | -1;
    return { repeat: { kind: "monthly", week }, weekday, until };
  }
  return null;
}

// "Every Saturday", "Every other Sunday", "First Saturday of the month".
export function describeRule(rule: string): string | null {
  const parsed = parseRule(rule);
  if (!parsed) return null;
  if (pageLocale() === "gu") {
    // Gujarati wording, from the translations (lib/i18n).
    const t = sharedT();
    const day = t(`repeat.day.${parsed.weekday}` as ClientKey);
    if (parsed.repeat.kind === "weekly") {
      return t(
        parsed.repeat.interval === 1 ? "repeat.weekly" : "repeat.fortnightly",
        { day },
      );
    }
    return t("repeat.monthly", {
      day,
      ordinal: t(`repeat.ordinal.${parsed.repeat.week}` as ClientKey),
    });
  }
  const day = DAY_NAMES[parsed.weekday];
  if (parsed.repeat.kind === "weekly") {
    return parsed.repeat.interval === 1 ? `Every ${day}` : `Every other ${day}`;
  }
  return `${ORDINALS[String(parsed.repeat.week)]} ${day} of the month`;
}

// Every date (YYYY-MM-DD) the event happens, from the first date to the
// "until" date inclusive. At most 60, as a safety limit.
export function occurrenceDates(rule: string, firstDate: string): string[] {
  const parsed = parseRule(rule);
  if (!parsed) return [firstDate];
  const out: string[] = [];
  const until = dateOnly(parsed.until);
  if (parsed.repeat.kind === "weekly") {
    const step = 7 * parsed.repeat.interval;
    for (
      let d = dateOnly(firstDate);
      d <= until && out.length < 60;
      d = addDays(d, step)
    ) {
      out.push(iso(d));
    }
    return out;
  }
  const { week } = parsed.repeat;
  const first = dateOnly(firstDate);
  for (let m = 0; out.length < 60; m++) {
    const monthStart = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + m, 1),
    );
    if (monthStart > until) break;
    let d: Date;
    if (week === -1) {
      const monthEnd = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
      );
      d = addDays(monthEnd, -((monthEnd.getUTCDay() - parsed.weekday + 7) % 7));
    } else {
      const offset = (parsed.weekday - monthStart.getUTCDay() + 7) % 7;
      d = addDays(monthStart, offset + 7 * (week - 1));
      if (d.getUTCMonth() !== monthStart.getUTCMonth()) continue;
    }
    if (d >= first && d <= until) out.push(iso(d));
  }
  return out;
}
