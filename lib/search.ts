import { titleWords } from "@/lib/duplicates";

// Search across Toran: what someone types in the one search box, matched
// against events, mandirs and festivals. Words are compared the way the
// duplicate check compares event names (lib/duplicates.ts), so festival
// spellings agree ("Deepavali" finds Diwali, "Annakoot" finds Annakut)
// and filler like "mandir" or "the" is ignored. A word matches the start
// of a word, so "leic" finds Leicester as it's typed. Gujarati is matched
// as written. Pure, so it's tested on its own.

export type Query = { words: string[]; gujarati: string };

const GUJARATI = /[઀-૿]/;

export function parseQuery(text: string): Query | null {
  const trimmed = text.trim().slice(0, 100);
  if (!trimmed) return null;
  const gujarati = GUJARATI.test(trimmed) ? trimmed : "";
  const words = [...titleWords(trimmed)];
  return words.length || gujarati ? { words, gujarati } : null;
}

// True when every word typed starts a word of the text (or, for Gujarati,
// the text contains what was typed).
export function matches(query: Query, ...texts: (string | null)[]): boolean {
  const present = texts.filter((t): t is string => Boolean(t));
  if (query.gujarati) {
    return present.some((t) => t.includes(query.gujarati));
  }
  const words = present.flatMap((t) => [...titleWords(t)]);
  return query.words.every((q) => words.some((w) => w.startsWith(q)));
}

type SearchableEvent = {
  title: string;
  title_gu: string | null;
  kind: string;
  mandir: { name: string; town: string; region: string };
};
type SearchableMandir = {
  name: string;
  town: string;
  region: string;
  tradition: string | null;
};
type SearchableFestival = { slug: string; name: string };

export const MOST = { events: 20, mandirs: 12, festivals: 6 };

// What matches, in the order given (events by date, mandirs by name),
// with how many matched in all.
export function search<
  E extends SearchableEvent,
  M extends SearchableMandir,
  F extends SearchableFestival,
>(
  data: { events: E[]; mandirs: M[]; festivals: F[] },
  query: Query,
  kindLabel: (kind: string) => string,
) {
  const events = data.events.filter((e) =>
    matches(
      query,
      e.title,
      e.title_gu,
      kindLabel(e.kind),
      e.mandir.name,
      e.mandir.town,
      e.mandir.region,
    ),
  );
  const mandirs = data.mandirs.filter((m) =>
    matches(query, m.name, m.town, m.region, m.tradition),
  );
  const festivals = data.festivals.filter((f) =>
    matches(query, f.name, f.slug.replace(/-/g, " ")),
  );
  return {
    total: events.length + mandirs.length + festivals.length,
    events: { shown: events.slice(0, MOST.events), count: events.length },
    mandirs: { shown: mandirs.slice(0, MOST.mandirs), count: mandirs.length },
    festivals: {
      shown: festivals.slice(0, MOST.festivals),
      count: festivals.length,
    },
  };
}
