// Pure helpers for laying out event lists: distance filtering and
// grouping by day. Kept apart from data loading so they can be tested.

import { londonDate } from "@/lib/format";
import { distanceMiles, type Position } from "@/lib/geo";
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

// "Today", "Tomorrow", or "Saturday 17 October". Static pages pass null
// for "now", so they never say "Today" on a page saved yesterday.
export function dayHeading(iso: string, now: Date | null): string {
  const day = londonDate(new Date(iso));
  if (!now) return longDay(day);
  const today = londonDate(now);
  const tomorrow = londonDate(new Date(now.getTime() + 86_400_000));
  if (day === today) return "Today";
  if (day === tomorrow) return "Tomorrow";
  return longDay(day);
}

function longDay(day: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function groupByDay<T extends { next_starts_at: string }>(
  events: readonly T[],
  now: Date | null,
): { heading: string; events: T[] }[] {
  const groups: { heading: string; events: T[] }[] = [];
  for (const e of events) {
    const heading = dayHeading(e.next_starts_at, now);
    const last = groups.at(-1);
    if (last?.heading === heading) last.events.push(e);
    else groups.push({ heading, events: [e] });
  }
  return groups;
}

export const RADII = [5, 15, 30, 60] as const;

export function radiusFrom(value: unknown): number {
  const n = Number(value);
  return (RADII as readonly number[]).includes(n) ? n : 15;
}
