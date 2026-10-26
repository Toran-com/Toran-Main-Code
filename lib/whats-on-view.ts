// Pure helpers for laying out event lists: distance filtering and
// grouping by day. Kept apart from data loading so they can be tested.

import type { EventPin } from "@/components/events-map";
import { formatEventStart, londonDate } from "@/lib/format";
import { distanceMiles, type Position } from "@/lib/geo";
import { pageLocale, sharedT } from "@/lib/i18n/locale";
import { withLocale } from "@/lib/i18n/paths";
import { eventPath } from "@/lib/share";
import type { ListedEvent } from "@/lib/whats-on";

export type EventNear = ListedEvent & { miles: number | null };

export function nearTo(
  events: readonly ListedEvent[],
  origin: Position | null,
  withinMiles: number,
): EventNear[] {
  if (!origin) return events.map((e) => ({ ...e, miles: null }));
  return events.flatMap((e) => {
    const { latitude, longitude } = e.mandir;
    if (latitude === null || longitude === null) return [];
    const miles = distanceMiles(origin, { latitude, longitude });
    return miles <= withinMiles ? [{ ...e, miles }] : [];
  });
}

// When searching near a place: each day's events nearest first (the days
// stay in order, so "Today" still comes first).
export function nearestFirstEachDay(events: readonly EventNear[]): EventNear[] {
  return events
    .map((e, i) => ({ e, i, day: londonDate(new Date(e.next_starts_at)) }))
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) ||
        (a.e.miles ?? Infinity) - (b.e.miles ?? Infinity) ||
        a.i - b.i,
    )
    .map(({ e }) => e);
}

// "Today", "Tomorrow", or "Saturday 17 October". Static pages pass null
// for "now", so they never say "Today" on a page saved yesterday.
export function dayHeading(iso: string, now: Date | null): string {
  const day = londonDate(new Date(iso));
  if (!now) return longDay(day);
  const today = londonDate(now);
  const tomorrow = londonDate(new Date(now.getTime() + 86_400_000));
  if (day === today) return sharedT()("heading.today");
  if (day === tomorrow) return sharedT()("heading.tomorrow");
  return longDay(day);
}

function longDay(day: string): string {
  return new Intl.DateTimeFormat(pageLocale() === "gu" ? "gu-IN" : "en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function groupByDay<T extends { next_starts_at: string }>(
  events: readonly T[],
  now: Date | null,
): { day: string; heading: string; events: T[] }[] {
  const groups: { day: string; heading: string; events: T[] }[] = [];
  for (const e of events) {
    const day = londonDate(new Date(e.next_starts_at));
    const last = groups.at(-1);
    if (last?.day === day) last.events.push(e);
    else
      groups.push({
        day,
        heading: dayHeading(e.next_starts_at, now),
        events: [e],
      });
  }
  return groups;
}

// A long list with nothing chosen to narrow it (no place, area, type or
// day) shows only the first few events of each day, with a link to the
// rest of that day, so nobody has to scroll past a whole country's events
// to find their own. Diwali week could bring 150 or more.
export const LONG_LIST = 30;
export const PER_DAY = 8;

// A day chosen in the address (?day=2026-11-08), or "" for none.
export function dayFrom(value: unknown): string {
  const day = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    !Number.isNaN(Date.parse(`${day}T00:00:00Z`))
    ? day
    : "";
}

export function onDay<T extends { next_starts_at: string }>(
  events: readonly T[],
  day: string,
): T[] {
  return day
    ? events.filter((e) => londonDate(new Date(e.next_starts_at)) === day)
    : [...events];
}

// "Today" or "This weekend" on What's on: worked out on the day the page
// is seen, so a shared link means the same thing to whoever opens it.
export type When = "" | "today" | "weekend";

export function whenFrom(value: unknown): When {
  return value === "today" || value === "weekend" ? value : "";
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// The dates (London) a choice covers. This weekend is the coming Saturday
// and Sunday, or what's left of it on a Saturday or Sunday.
export function datesFor(when: When, today: string): string[] {
  if (when === "today") return [today];
  if (when !== "weekend") return [];
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday === 0) return [today];
  const saturday = addDays(today, 6 - weekday);
  return [saturday, addDays(saturday, 1)];
}

export function onDays<T extends { next_starts_at: string }>(
  events: readonly T[],
  days: readonly string[],
): T[] {
  return days.length
    ? events.filter((e) =>
        days.includes(londonDate(new Date(e.next_starts_at))),
      )
    : [...events];
}

// How many events each area has, most first: for "Choose your area".
export function regionCounts(
  events: readonly { mandir: { region: string } }[],
): { region: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.mandir.region, (counts.get(e.mandir.region) ?? 0) + 1);
  }
  return [...counts]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region));
}

// A long day's heading, for "See all 31 on Sunday 8 November".
export function longDayHeading(day: string): string {
  return longDay(day);
}

export const RADII = [5, 15, 30, 60] as const;

export function radiusFrom(value: unknown): number {
  const n = Number(value);
  return (RADII as readonly number[]).includes(n) ? n : 15;
}

// What's on as a map: one pin per mandir with events in the list (not
// cancelled ones, and only mandirs with a map position), with its next
// few in words.
const PIN_EVENTS = 3;

export function pinsFor(events: readonly ListedEvent[]): EventPin[] {
  const locale = pageLocale();
  const pins = new Map<string, EventPin>();
  for (const e of events) {
    const { slug, name, town, latitude, longitude } = e.mandir;
    if (e.status === "cancelled" || latitude === null || longitude === null) {
      continue;
    }
    let pin = pins.get(slug);
    if (!pin) {
      pin = {
        slug,
        name,
        town,
        latitude,
        longitude,
        count: 0,
        events: [],
        more: withLocale(`/mandirs/${slug}`, locale),
      };
      pins.set(slug, pin);
    }
    pin.count++;
    if (pin.events.length < PIN_EVENTS) {
      pin.events.push({
        when: formatEventStart(e.next_starts_at, e.all_day),
        title: (locale === "gu" && e.title_gu) || e.title,
        path: withLocale(eventPath(slug, e.id), locale),
      });
    }
  }
  return [...pins.values()];
}
