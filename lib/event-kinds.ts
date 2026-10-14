// The kinds of event a mandir puts on (events.kind in the database), in
// the order people choose from, and where an event came from
// (events.origin), for the label families see on it.

export const EVENT_KINDS = {
  festival: "Festival",
  aarti: "Aarti or darshan",
  bhajan: "Bhajans or kirtan",
  katha: "Katha or talk",
  class: "Class",
  youth: "Youth",
  seva: "Seva day",
  community: "Community (meals, health, sport)",
  other: "Other",
} as const;

export type EventKind = keyof typeof EVENT_KINDS;

export function isEventKind(value: string): value is EventKind {
  return value in EVENT_KINDS;
}

// A kind's name, or null for "other" (not worth a label).
export function kindLabel(kind: string): string | null {
  return isEventKind(kind) && kind !== "other" ? EVENT_KINDS[kind] : null;
}

export type EventOrigin = "mandir" | "poster" | "website" | "visitor";

// Where a published poster came from, as the event's origin.
export function originOfPoster(from: string): EventOrigin {
  if (from === "website") return "website";
  if (from === "visitor") return "visitor";
  return "poster";
}

// What families are told about where an event's details came from: the
// mandir confirming it beats everything else.
export function sourceLabel(event: {
  confirmed_at: string | null;
  origin: string | null;
}): string | null {
  if (event.confirmed_at) return "Confirmed by the mandir";
  switch (event.origin) {
    case "website":
      return "From the mandir's website";
    case "visitor":
      return "Sent in by a visitor";
    case "poster":
      return "From a poster or message";
    default:
      return null;
  }
}
