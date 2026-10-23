import { type Listed, listedEvents, matchesFor } from "@/lib/duplicate-check";
import { type Poster, type PosterSource } from "@/lib/posters";

// What's waiting for review, whoever reviews it (Toran on /ops/posters, a
// committee on its own page), with a warning when an item looks like an
// event already on the page or another item in the queue.

export type SourceGroup = "poster" | "visitor" | "website";

export const SOURCE_GROUPS: Record<SourceGroup, string> = {
  poster: "Typed-up posters",
  visitor: "From visitors",
  website: "From websites",
};

export function sourceGroup(from: PosterSource): SourceGroup {
  return from === "visitor"
    ? "visitor"
    : from === "website"
      ? "website"
      : "poster";
}

export type Duplicate = {
  kind: "event" | "queue";
  id: string;
  title: string;
  time: string;
  // "same": surely the same event; "maybe": a person decides.
  verdict: "same" | "maybe";
  // A listed event the mandir has cancelled.
  cancelled: boolean;
};

// Upcoming events at these mandirs, one entry per date they happen on
// (repeating events once per date), to compare the queue with.
export const eventCandidates = listedEvents;

// Each item's look-alikes: events at its mandir on the same day, and other
// items in the queue for the same mandir and day, surest first. An event
// is named once however many of its dates match.
export function withDuplicates<
  T extends { id: string; mandirId: string; poster: Poster },
>(
  items: readonly T[],
  events: Map<string, Listed[]>,
): (T & { duplicates: Duplicate[] })[] {
  return items.map((item) => {
    const queue = items
      .filter((other) => other.mandirId === item.mandirId)
      .map((other) => ({
        kind: "queue" as const,
        id: other.id,
        title: other.poster.title,
        date: other.poster.date,
        time: other.poster.time,
        discarded: false,
      }));
    const found = matchesFor(
      {
        title: item.poster.title,
        date: item.poster.date,
        time: item.poster.time,
      },
      [
        ...(events.get(item.mandirId) ?? []),
        ...queue.filter((q) => q.id !== item.id),
      ],
    );
    return {
      ...item,
      duplicates: found.map((c) => ({
        kind: c.kind,
        id: c.id,
        title: c.title,
        time: c.time,
        verdict: c.verdict,
        cancelled: c.kind === "event" && c.cancelled,
      })),
    };
  });
}
