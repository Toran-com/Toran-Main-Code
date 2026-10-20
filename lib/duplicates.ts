import { FESTIVAL_WORDS, mentionsFestival } from "@/lib/festival-words";

// Spots when something waiting for review looks like an event that's
// already on the mandir's page, or like another item in the queue: the
// same mandir, the same day, and a title that's nearly the same or names
// the same festival. Events reach Toran from posters, visitors and
// mandirs' websites, so the same event often arrives twice. Pure, so it's
// tested on its own.

export type Comparable = { title: string; date: string };

export type Candidate = Comparable & {
  kind: "event" | "queue";
  id: string;
};

// Words that say nothing about which event it is.
const FILLER = new Set([
  "a",
  "an",
  "and",
  "at",
  "celebration",
  "celebrations",
  "celebrate",
  "day",
  "event",
  "for",
  "in",
  "mandir",
  "of",
  "on",
  "programme",
  "program",
  "special",
  "temple",
  "the",
  "with",
]);

export function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => (w.length > 3 ? w.replace(/s$/, "") : w))
      .filter((w) => w && !FILLER.has(w)),
  );
}

export function looksTheSame(a: Comparable, b: Comparable): boolean {
  if (a.date !== b.date) return false;
  const x = titleWords(a.title);
  const y = titleWords(b.title);
  if (x.size && y.size) {
    const shared = [...x].filter((w) => y.has(w)).length;
    // One title inside the other ("Diwali" and "Diwali at the mandir"),
    // or most words in common.
    if (shared === Math.min(x.size, y.size)) return true;
    if (shared / new Set([...x, ...y]).size >= 0.5) return true;
  }
  // Both name the same festival, however it's spelled.
  return Object.keys(FESTIVAL_WORDS).some(
    (slug) =>
      mentionsFestival(slug, a.title) && mentionsFestival(slug, b.title),
  );
}

export function duplicatesOf(
  item: Comparable & { id: string },
  candidates: readonly Candidate[],
): Candidate[] {
  return candidates.filter((c) => c.id !== item.id && looksTheSame(item, c));
}
