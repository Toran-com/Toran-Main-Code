// The Seva page's finder (components/seva-explorer.tsx): what kind of seva,
// which day, what time of day and how near. The page sends every event
// that needs people, already worked out on the server (lib/seva-needs.ts);
// these narrow it down in the browser as visitors choose, so nothing here
// may load server code. Numbers only; no volunteer is named (decision
// 0013).

import { distanceMiles, type Position } from "@/lib/geo";
import { londonTime } from "@/lib/london";

// The kinds of seva to choose between. Committees name their roles
// freely, so each role is placed by the words in its name; anything else
// is "other".
export const ROLE_KINDS = [
  "kitchen",
  "parking",
  "shoes",
  "decorations",
  "prasad",
  "children",
  "cleaning",
  "welcome",
  "other",
] as const;

export type RoleKind = (typeof ROLE_KINDS)[number];

// Checked in this order, so "Prasad serving" is prasad, not kitchen, and
// "Children's corner" is children.
const KIND_WORDS: [RoleKind, RegExp][] = [
  ["children", /\b(child|children|kids?|youth|bal ?sabha)\b/i],
  ["shoes", /\b(shoes?|footwear|chappals?)\b/i],
  ["parking", /\b(park|parking|cars?|traffic)\b/i],
  ["prasad", /\b(prasad|prashad|sweets?|mithai)\b/i],
  [
    "kitchen",
    /\b(kitchen|cooks?|cooking|food|serving|servers?|bhojan|langar|tea|chai)\b/i,
  ],
  [
    "decorations",
    /\b(decor|decorating|decorations?|flowers?|rangoli|lights?|diyas?)\b/i,
  ],
  ["cleaning", /\b(clean|cleaning|cleaners?|tidy|tidying|clear[- ]?up)\b/i],
  [
    "welcome",
    /\b(welcome|welcoming|stewards?|stewarding|security|doors?|reception|queues?|marshals?)\b/i,
  ],
];

export function roleKind(name: string): RoleKind {
  return KIND_WORDS.find(([, words]) => words.test(name))?.[0] ?? "other";
}

// When in the day a shift starts, in UK time.
export type PartOfDay = "morning" | "afternoon" | "evening";

export const PARTS_OF_DAY: readonly PartOfDay[] = [
  "morning",
  "afternoon",
  "evening",
];

export function partOfDay(startsAt: string): PartOfDay {
  const hour = Number(londonTime(new Date(startsAt)).slice(0, 2));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

// One shift that still needs people, with its words worked out on the
// server in the page's language.
export type FinderShift = {
  id: string;
  role: string;
  kind: RoleKind;
  needsDbs: boolean;
  startsAt: string;
  endsAt: string;
  needed: number;
  free: number;
  // "Sat 24 Oct, 5pm–8pm", and just "5pm–8pm".
  label: string;
  time: string;
  // The UK day it's on (YYYY-MM-DD).
  day: string;
  part: PartOfDay;
};

export type FinderNeed = {
  id: string;
  title: string;
  titleGu: string | null;
  slug: string;
  mandir: string;
  town: string;
  // Name, town and postcode, for calendars.
  place: string;
  latitude: number | null;
  longitude: number | null;
  // The event's rota page.
  path: string;
  // The date tile's three lines, and the date in words.
  tile: { month: string; day: string; weekday: string };
  dateLabel: string;
  shifts: FinderShift[];
};

export type Choice = {
  kind: RoleKind | "";
  day: string;
  part: PartOfDay | "";
};

export type Found = {
  need: FinderNeed;
  // The shifts that match what was chosen.
  shifts: FinderShift[];
  miles: number | null;
};

export function shiftMatches(
  s: FinderShift,
  choice: Choice,
  ignore?: keyof Choice,
): boolean {
  return (
    (ignore === "kind" || !choice.kind || s.kind === choice.kind) &&
    (ignore === "day" || !choice.day || s.day === choice.day) &&
    (ignore === "part" || !choice.part || s.part === choice.part)
  );
}

// The events near enough (when a place is given), with how far.
export function nearEnough(
  needs: readonly FinderNeed[],
  origin: Position | null,
  within: number | null,
): { need: FinderNeed; miles: number | null }[] {
  return needs.flatMap((need): { need: FinderNeed; miles: number | null }[] => {
    if (!origin) return [{ need, miles: null }];
    if (need.latitude === null || need.longitude === null) return [];
    const miles = distanceMiles(origin, {
      latitude: need.latitude,
      longitude: need.longitude,
    });
    return within === null || miles <= within ? [{ need, miles }] : [];
  });
}

// What matches: soonest first, and nearest first within a day when a
// place is given.
export function findSeva(
  near: readonly { need: FinderNeed; miles: number | null }[],
  choice: Choice,
): Found[] {
  return near
    .flatMap(({ need, miles }) => {
      const shifts = need.shifts.filter((s) => shiftMatches(s, choice));
      return shifts.length ? [{ need, shifts, miles }] : [];
    })
    .sort(
      (a, b) =>
        a.shifts[0].day.localeCompare(b.shifts[0].day) ||
        (a.miles ?? 0) - (b.miles ?? 0) ||
        a.shifts[0].startsAt.localeCompare(b.shifts[0].startsAt),
    );
}

// Places free for each option of one choice, given the other two, for
// the counts on the tiles and days: "Kitchen 12 places".
export function placesBy<K extends keyof Choice>(
  near: readonly { need: FinderNeed }[],
  choice: Choice,
  key: K,
  valueOf: (s: FinderShift) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { need } of near) {
    for (const s of need.shifts) {
      if (!shiftMatches(s, choice, key)) continue;
      const value = valueOf(s);
      counts.set(value, (counts.get(value) ?? 0) + s.free);
    }
  }
  return counts;
}
