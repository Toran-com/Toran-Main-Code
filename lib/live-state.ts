import { londonDate } from "@/lib/london";

// Live now (decision 0026), worked out from a list of event times and the
// moment it is: pure, so the visitor's phone runs it and it's tested on
// its own. lib/live.ts loads the list.

export type LiveEvent = {
  id: string;
  title: string;
  title_gu: string | null;
  kind: string;
  origin: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
  mandir: { slug: string; name: string; town: string; live_url: string | null };
  // Its start and end as the page shows them ("6:30pm"), added on the
  // server in the page's language.
  labels?: { start: string; end: string };
};

// How long an event with no end time is taken to last.
export const AARTI_MINUTES = 45;
export const EVENT_MINUTES = 120;

export const DAY = 86_400_000;

export type LiveRow = {
  id: string;
  title: string;
  title_gu: string | null;
  kind: string;
  origin: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
  recurrence: string | null;
  mandir: LiveEvent["mandir"];
  event_occurrences:
    { starts_at: string; ends_at: string | null; cancelled: boolean }[] | null;
};

// Each time an event happens between `from` and `to`, as its own entry: a
// one-off event once, a repeating one for each date that isn't cancelled.
export function occurrences(
  rows: readonly LiveRow[],
  from: string,
  to: string,
): LiveEvent[] {
  return rows
    .flatMap(({ recurrence, event_occurrences, ...event }) => {
      const times = recurrence
        ? (event_occurrences ?? [])
            .filter((o) => !o.cancelled)
            .map((o) => ({ starts_at: o.starts_at, ends_at: o.ends_at }))
        : [{ starts_at: event.starts_at, ends_at: event.ends_at }];
      return times
        .filter((o) => o.starts_at >= from && o.starts_at <= to)
        .map((o) => ({ ...event, ...o }));
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

// When an event is over: its own end time; for an all-day event, the end
// of its day in the UK; otherwise a usual length (an aarti is shorter).
export function endOf(event: LiveEvent): number {
  if (event.ends_at) return Date.parse(event.ends_at);
  if (event.all_day) {
    const day = londonDate(new Date(event.starts_at));
    return nextLondonMidnight(day);
  }
  const minutes = event.origin === "aarti" ? AARTI_MINUTES : EVENT_MINUTES;
  return Date.parse(event.starts_at) + minutes * 60_000;
}

// The moment a UK day ends, allowing for summer time.
function nextLondonMidnight(day: string): number {
  let t = Date.parse(`${day}T00:00:00Z`) + DAY;
  // Midnight in London is 23:00 UTC in summer: step back while it's
  // still the same day there.
  while (londonDate(new Date(t - 3_600_000)) !== day) t -= 3_600_000;
  return t;
}

// What's on at `now`, and what's still to come later the same UK day.
export function liveState(
  events: readonly LiveEvent[],
  now: number,
): { now: LiveEvent[]; later: LiveEvent[] } {
  const today = londonDate(new Date(now));
  const on: LiveEvent[] = [];
  const later: LiveEvent[] = [];
  for (const event of events) {
    const start = Date.parse(event.starts_at);
    if (start <= now && now < endOf(event)) on.push(event);
    else if (start > now && londonDate(new Date(start)) === today) {
      later.push(event);
    }
  }
  return { now: on, later };
}
