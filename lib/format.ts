// Small formatting and grouping helpers for the public pages. Dates are
// shown in UK style and UK time, whatever the server's own time zone.

const LONDON = "Europe/London";

// Today's date in London as YYYY-MM-DD.
export function londonDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// The time in London as HH:MM (24-hour), as a time input wants it.
export function londonTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

// A date-only value (YYYY-MM-DD) as a Date at midnight UTC, so formatting in
// UTC never shifts it a day.
function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

// "Sun 8 Nov" (and the year if asked), built from parts so the result
// doesn't depend on how a given Node version punctuates dates.
function dayLabel(at: Date, timeZone: string, withYear = false): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const label = `${get("weekday")} ${get("day")} ${get("month")}`;
  return withYear ? `${label} ${get("year")}` : label;
}

// "Sun 8 Nov 2026", or "Sun 11 Oct – Mon 19 Oct 2026" for a range.
export function formatDateRange(startsOn: string, endsOn: string): string {
  const start = dateOnly(startsOn);
  if (endsOn === startsOn) return dayLabel(start, "UTC", true);
  const end = dateOnly(endsOn);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  return `${dayLabel(start, "UTC", !sameYear)} – ${dayLabel(end, "UTC", true)}`;
}

// "November 2026" for a YYYY-MM-DD date.
export function monthOf(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(dateOnly(value));
}

// "Sat 11 Oct, 7pm" or "Sat 11 Oct, 7:30pm" in UK time; no time when all day.
export function formatEventStart(startsAt: string, allDay: boolean): string {
  const at = new Date(startsAt);
  const day = dayLabel(at, LONDON);
  if (allDay) return day;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const minute = get("minute");
  const time = `${get("hour")}${minute === "00" ? "" : `:${minute}`}${get("dayPeriod").toLowerCase().replace(/\s/g, "")}`;
  return `${day}, ${time}`;
}

// "7:30pm" in UK time.
function clockLabel(at: Date): string {
  return formatEventStart(at.toISOString(), false).split(", ")[1];
}

// Just the time of day, for lists already grouped by day: "7pm",
// "7:30pm", or "All day".
export function formatTimeOfDay(startsAt: string, allDay: boolean): string {
  if (allDay) return "All day";
  return formatEventStart(startsAt, false).split(", ")[1] ?? "";
}

// When an event happens, start to finish, in UK time:
// "Sat 24 Oct, 7:30pm – 11pm", "Sat 24 Oct, 10pm – Sun 25 Oct, 1am",
// "Sun 8 Nov" or "Sat 7 Nov – Sun 8 Nov" for all-day events.
export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  allDay: boolean,
): string {
  const start = formatEventStart(startsAt, allDay);
  if (!endsAt || new Date(endsAt) <= new Date(startsAt)) return start;
  if (allDay) {
    const end = formatEventStart(endsAt, true);
    return end === start ? start : `${start} – ${end}`;
  }
  const sameDay =
    londonDate(new Date(startsAt)) === londonDate(new Date(endsAt));
  return sameDay
    ? `${start} – ${clockLabel(new Date(endsAt))}`
    : `${start} – ${formatEventStart(endsAt, false)}`;
}

const CALENDARS: Record<string, string> = {
  gujarati: "Gujarati calendar",
  north_indian: "North Indian calendar",
  tamil: "Tamil calendar",
  bengali: "Bengali calendar",
  other: "Other calendars",
};

export function calendarLabel(calendar: string | null): string | null {
  return calendar ? (CALENDARS[calendar] ?? null) : null;
}

// "derbyhindutemple.com" for https://www.derbyhindutemple.com/
export function websiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// "east-midlands" for "East Midlands", for in-page links.
export function anchorFor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type TownGroup<T> = { town: string; mandirs: T[] };
export type RegionGroup<T> = { region: string; towns: TownGroup<T>[] };

// Groups mandirs by region, then town, each sorted alphabetically.
export function groupByRegionAndTown<
  T extends { region: string; town: string; name: string },
>(mandirs: readonly T[]): RegionGroup<T>[] {
  const regions = new Map<string, Map<string, T[]>>();
  for (const m of mandirs) {
    const towns = regions.get(m.region) ?? new Map<string, T[]>();
    regions.set(m.region, towns);
    towns.set(m.town, [...(towns.get(m.town) ?? []), m]);
  }
  const byName = (a: string, b: string) => a.localeCompare(b, "en-GB");
  return [...regions.entries()]
    .sort(([a], [b]) => byName(a, b))
    .map(([region, towns]) => ({
      region,
      towns: [...towns.entries()]
        .sort(([a], [b]) => byName(a, b))
        .map(([town, list]) => ({
          town,
          mandirs: [...list].sort((a, b) => byName(a.name, b.name)),
        })),
    }));
}

// Keeps mandirs whose name, town or region contains every word typed.
export function matchesSearch(
  m: { name: string; town: string; region: string; tradition?: string | null },
  query: string,
): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text =
    `${m.name} ${m.town} ${m.region} ${m.tradition ?? ""}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

// The UTC instant for a UK wall-clock date and time ("2026-10-11", "19:00"),
// allowing for British Summer Time. Returns null for impossible values.
export function londonToUtc(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [...d.slice(1), ...t.slice(1)].map(Number);
  if (h > 23 || mi > 59) return null;
  const wall = Date.UTC(y, mo - 1, da, h, mi);
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== da) return null;
  // London is UTC or UTC+1: try the offset in force at that moment.
  for (const offsetHours of [1, 0]) {
    const guess = new Date(wall - offsetHours * 3_600_000);
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: LONDON,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(guess);
    if (londonDate(guess) === date && shown === time) return guess;
  }
  // A time skipped when the clocks go forward: use the hour after.
  return new Date(wall);
}
