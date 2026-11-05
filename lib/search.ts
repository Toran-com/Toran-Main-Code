import { titleWords } from "@/lib/duplicates";

// Search across Toran: what someone types in the one search box, matched
// against events, mandirs and festivals. Words are compared the way the
// duplicate check compares event names (lib/duplicates.ts), so festival
// spellings agree ("Deepavali" finds Diwali, "Annakoot" finds Annakut)
// and filler like "mandir" or "the" is ignored. A word matches the start
// of a word, so "leic" finds Leicester as it's typed. When nothing matches,
// close spellings do ("Leicster", "Navrati"): one letter wrong, missing,
// extra or swapped, or two in a long word. Gujarati is matched as
// written. Pure, so it's tested on its own.

export type Query = { words: string[]; gujarati: string };

const GUJARATI = /[઀-૿]/;

export function parseQuery(text: string): Query | null {
  const trimmed = text.trim().slice(0, 100);
  if (!trimmed) return null;
  const gujarati = GUJARATI.test(trimmed) ? trimmed : "";
  const words = [...titleWords(trimmed)];
  return words.length || gujarati ? { words, gujarati } : null;
}

// Letters that must change to turn one word into the other, counting two
// swapped letters as one (optimal string alignment distance).
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

// How many letters may be wrong in a word this long: none in short words,
// where a slip makes another word ("ram", "rama"), more in long ones.
function slips(word: string): number {
  return word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0;
}

// A typed word is close to a word of the text when it's a slip away from
// the whole word, or from its start (so a typo still matches mid-typing).
export function closeTo(typed: string, word: string): boolean {
  const most = slips(typed);
  if (!most) return false;
  if (editDistance(typed, word) <= most) return true;
  for (const n of [typed.length - 1, typed.length, typed.length + 1]) {
    if (
      n >= 4 &&
      n < word.length &&
      editDistance(typed, word.slice(0, n)) <= most
    ) {
      return true;
    }
  }
  return false;
}

// True when every word typed starts a word of the text (or, for Gujarati,
// the text contains what was typed).
export function matches(query: Query, ...texts: (string | null)[]): boolean {
  return matchesWith(query, false, texts);
}

// The same, where "close" also lets each word be a close spelling.
function matchesWith(
  query: Query,
  close: boolean,
  texts: (string | null)[],
): boolean {
  const present = texts.filter((t): t is string => Boolean(t));
  if (query.gujarati) {
    return present.some((t) => t.includes(query.gujarati));
  }
  const words = present.flatMap((t) => [...titleWords(t)]);
  return query.words.every((q) =>
    words.some((w) => w.startsWith(q) || (close && closeTo(q, w))),
  );
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
  const find = (close: boolean) => {
    const match = (...texts: (string | null)[]) =>
      matchesWith(query, close, texts);
    return {
      events: data.events.filter((e) =>
        match(
          e.title,
          e.title_gu,
          kindLabel(e.kind),
          e.mandir.name,
          e.mandir.town,
          e.mandir.region,
        ),
      ),
      mandirs: data.mandirs.filter((m) =>
        match(m.name, m.town, m.region, m.tradition),
      ),
      festivals: data.festivals.filter((f) =>
        match(f.name, f.slug.replace(/-/g, " ")),
      ),
    };
  };
  // Close spellings only when the words as typed find nothing, so a typo
  // still finds something but never crowds out what was meant.
  let found = find(false);
  let close = false;
  if (
    !found.events.length &&
    !found.mandirs.length &&
    !found.festivals.length
  ) {
    found = find(true);
    close = true;
  }
  const { events, mandirs, festivals } = found;
  const total = events.length + mandirs.length + festivals.length;
  return {
    total,
    // True when what's shown are close spellings of what was typed.
    close: close && total > 0,
    events: { shown: events.slice(0, MOST.events), count: events.length },
    mandirs: { shown: mandirs.slice(0, MOST.mandirs), count: mandirs.length },
    festivals: {
      shown: festivals.slice(0, MOST.festivals),
      count: festivals.length,
    },
  };
}
