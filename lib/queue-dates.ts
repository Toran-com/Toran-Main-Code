import type { EventInput } from "@/lib/event-form";

// When something waiting in the review queue happens, for sorting the
// queue (soonest first) and for spotting what can't be published any more
// because its date has passed (the "Date has passed" list on
// /ops/posters, and the nightly job's tidy-up). Dates are London calendar
// days, YYYY-MM-DD, so they compare as strings.

type Dated = Pick<EventInput, "date" | "repeat" | "until">;

// The last day it happens: its date, or for a repeating event the end of
// the repeats. A repeating event with no end never runs out (null).
export function lastDate(item: Dated): string | null {
  if (!item.repeat) return item.date || null;
  return item.until || null;
}

// Whether every date it happens on is before today.
export function hasPassed(item: Dated, today: string): boolean {
  const last = lastDate(item);
  return last !== null && last < today;
}

// Soonest first; anything without a date goes last.
export function bySoonest(a: Dated, b: Dated): number {
  const x = a.date || "9999-12-31";
  const y = b.date || "9999-12-31";
  return x < y ? -1 : x > y ? 1 : 0;
}

// The note left on a queue item discarded because its date had passed.
export const PAST_QUEUE_NOTE =
  "Discarded: its date passed before it was checked.";
