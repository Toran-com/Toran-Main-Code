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

// A best guess at an event's kind from its name and description, for
// events read from websites and posters. Whoever checks the event can
// change it; anything unclear is "other".
const KIND_WORDS: [EventKind, RegExp][] = [
  [
    "festival",
    /\b(diwali|deepavali|navratri|navaratri|garba|dandiya|dussehra|dasara|holi|janmashtami|janmasthami|ram ?navami|shivaratri|shivratri|annakut|annakoot|ganesh chaturthi|ganesh utsav|raksha bandhan|rakhi|makar sankranti|pongal|vaisakhi|baisakhi|onam|sharad purnima|guru purnima|bhai dooj|new year|utsav|mahotsav|jayanti|festival|mela)\b/i,
  ],
  [
    "aarti",
    /\b(aarti|arti|arati|darshan|abhishek(am)?|puja|pooja|havan|yagna|yajna|mangala)\b/i,
  ],
  [
    "bhajan",
    /\b(bhajans?|kirtans?|keertan|satsang|sankirtan|chanting|kirtan)\b/i,
  ],
  [
    "katha",
    /\b(katha|pravachan|discourse|lecture|talk|gita|bhagavat|ramayan|ramayana|saptah)\b/i,
  ],
  [
    "youth",
    /\b(youth|yuva|kids|children'?s|teens?|students?|bal ?vihar|bala ?vihar)\b/i,
  ],
  [
    "class",
    /\b(class(es)?|course|lessons?|workshop|yoga|meditation|sanskrit|gujarati school|music school)\b/i,
  ],
  ["seva", /\b(seva|sewa|volunteer(ing)?|clean[- ]?up)\b/i],
  [
    "community",
    /\b(lunch|dinner|meal|langar|bhandara|prasadam|feast|health|blood donation|fun ?run|walk|sports?|cricket|social)\b/i,
  ],
];

export function guessKind(text: string): EventKind {
  for (const [kind, words] of KIND_WORDS) if (words.test(text)) return kind;
  return "other";
}
