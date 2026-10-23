import { compareEvents, type Verdict } from "@/lib/duplicates";

// The clean-up list on /ops/duplicates: copies already on Toran (two
// events at one mandir that are, or may be, the same) and mandirs that
// may be listed twice. New copies are stopped as they arrive
// (lib/duplicate-check.ts); this finds the ones from before, and any a
// person let through by mistake. Pure, so it's tested on its own.

export type ListedEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
};

export type EventPair = {
  verdict: Exclude<Verdict, "different">;
  date: string;
  a: ListedEvent;
  b: ListedEvent;
};

// Look-alike pairs among one mandir's events, surest first, then soonest.
// A repeating event that matches on several dates is paired once; pairs a
// person has kept apart (`apart`, "a|b" with the smaller id first) are
// left out.
export function eventPairs(
  events: readonly ListedEvent[],
  apart: ReadonlySet<string> = new Set(),
): EventPair[] {
  const byDay = new Map<string, ListedEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const pairs = new Map<string, EventPair>();
  for (const [date, day] of [...byDay].sort(([x], [y]) => x.localeCompare(y))) {
    for (let i = 0; i < day.length; i++) {
      for (let j = i + 1; j < day.length; j++) {
        // The smaller id first, as the database keeps pairs.
        const [a, b] =
          day[i].id < day[j].id ? [day[i], day[j]] : [day[j], day[i]];
        const key = `${a.id}|${b.id}`;
        if (a.id === b.id || apart.has(key) || pairs.has(key)) continue;
        const verdict = compareEvents(a, b);
        if (verdict !== "different") pairs.set(key, { verdict, date, a, b });
      }
    }
  }
  return [...pairs.values()].sort(
    (x, y) =>
      (x.verdict === y.verdict ? 0 : x.verdict === "same" ? -1 : 1) ||
      x.date.localeCompare(y.date),
  );
}

export type DirectoryMandir = {
  id: string;
  slug: string;
  name: string;
  town: string;
  postcode: string | null;
};

// Words in mandirs' names that don't tell one from another.
const GENERIC = new Set([
  "and",
  "association",
  "center",
  "centre",
  "community",
  "cultural",
  "hindu",
  "mandal",
  "mandir",
  "of",
  "samaj",
  "shree",
  "shri",
  "society",
  "sri",
  "temple",
  "the",
  "trust",
  "uk",
]);

function nameWords(name: string, town: string): Set<string> {
  const place = town.toLowerCase();
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !GENERIC.has(w) && w !== place),
  );
}

// Mandirs that may be the same place listed twice: the same postcode, or
// the same town and nearly the same name.
export function mandirPairs(
  mandirs: readonly DirectoryMandir[],
): { a: DirectoryMandir; b: DirectoryMandir; why: "postcode" | "name" }[] {
  const pairs: {
    a: DirectoryMandir;
    b: DirectoryMandir;
    why: "postcode" | "name";
  }[] = [];
  const code = (p: string | null) => (p ?? "").toUpperCase().replace(/\s/g, "");
  for (let i = 0; i < mandirs.length; i++) {
    for (let j = i + 1; j < mandirs.length; j++) {
      const a = mandirs[i];
      const b = mandirs[j];
      if (code(a.postcode) && code(a.postcode) === code(b.postcode)) {
        pairs.push({ a, b, why: "postcode" });
        continue;
      }
      if (a.town.toLowerCase() !== b.town.toLowerCase()) continue;
      const x = nameWords(a.name, a.town);
      const y = nameWords(b.name, b.town);
      if (!x.size || !y.size) continue;
      const shared = [...x].filter((w) => y.has(w)).length;
      if (shared / new Set([...x, ...y]).size >= 0.6) {
        pairs.push({ a, b, why: "name" });
      }
    }
  }
  return pairs;
}
