// Classes and regular groups (/regular): every weekly, fortnightly or
// monthly event across the mandirs, by the day of the week it's on, so a
// family can see what's on every Tuesday evening, say. A festival's run of
// nights isn't a regular group, so daily ones are left out. Pure, so it's
// tested on its own.

import { londonTime } from "@/lib/london";
import { parseRule } from "@/lib/recurrence";
import type { ListedEvent } from "@/lib/whats-on";

export type RegularDay = {
  // 1 = Monday … 7 = Sunday, so the week starts on Monday.
  weekday: number;
  events: ListedEvent[];
};

export function regularGroups(events: readonly ListedEvent[]): RegularDay[] {
  const days = new Map<number, ListedEvent[]>();
  for (const e of events) {
    if (e.status !== "published" || !e.recurrence) continue;
    const rule = parseRule(e.recurrence);
    if (!rule || rule.repeat.kind === "daily") continue;
    const weekday = rule.weekday === 0 ? 7 : rule.weekday;
    days.set(weekday, [...(days.get(weekday) ?? []), e]);
  }
  // All day first, then by time, then by mandir.
  const order = (e: ListedEvent) =>
    `${e.all_day ? "00:00" : londonTime(new Date(e.next_starts_at))} ${e.mandir.name}`;
  return [...days.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekday, list]) => ({
      weekday,
      events: [...list].sort((a, b) => order(a).localeCompare(order(b))),
    }));
}

// "Monday", in the page's language (weekday 1 = Monday … 7 = Sunday).
export function weekdayName(weekday: number, locale: string): string {
  // 5 January 2026 was a Monday.
  const day = new Date(Date.UTC(2026, 0, 4 + weekday));
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  }).format(day);
}
