// Spots the same event arriving twice. Events reach Toran from committees,
// posters, visitors and mandirs' websites, so one event is often written
// down more than once, and worded or spelled differently each time
// ("Annakoot darshan", "Annakut", "Nutan Varsh & Annakut"). Two events
// are compared by mandir and day (the caller's job), their start times and
// the words in their names, giving one of three answers:
//
// - "same": the same event. A second copy is never made; anything new it
//   says is added to the one already there.
// - "maybe": close enough that a person decides, once.
// - "different": two events, both kept (Diwali fireworks and Chopda pujan
//   on the same evening).
//
// Pure, so the rules are tested on their own (lib/duplicate-check.ts does
// the reading and writing).

export type Verdict = "same" | "maybe" | "different";

export type Comparable = {
  title: string;
  // The UK day (YYYY-MM-DD) and start time (HH:MM), or "" for all day.
  date: string;
  time?: string;
};

// One spelling for each word that's written many ways. Matched as whole
// words or phrases, longest first.
const SPELLINGS: [RegExp, string][] = (
  [
    ["deepavali|deepawali|dipavali|dipawali|divali|deepavli", "diwali"],
    [
      "annakoot|annkut|annkoot|ankut|ankoot|anakut|annakuta|annakutotsav|ankoototsav|annkutotsav",
      "annakut",
    ],
    [
      "nutan varsh|nutan varsha|nootan varsh|nutanvarsh|nutan varsharambh|varsharambh|new year|bestu varas|bestu varsh|navu varsh|vikram samvat",
      "newyear",
    ],
    [
      "kali chaudas|kaali chaudas|kali chaudash|kaali chaudash|kali chaudashi|kali chaturdashi|narak chaturdashi",
      "kalichaudas",
    ],
    ["dhan teras|dhanterus|dhantrayodashi|dhan terus", "dhanteras"],
    [
      "sharad purnima|sharad poonam|sharad punam|sharad poornima|sarad purnima|kojagari",
      "sharadpurnima",
    ],
    [
      "bhai dooj|bhai duj|bhai bij|bhai beej|bhaibij|bhaubeej|bhai tika",
      "bhaidooj",
    ],
    [
      "labh pancham|labh panchami|laabh paacham|labh pacham|labh panchmi",
      "labhpancham",
    ],
    [
      "karwa chauth|karva chauth|karva choth|karwa choth|karva chaut",
      "karwachauth",
    ],
    ["jalaram jayanti|jalaram jayanthi", "jalaramjayanti"],
    ["govardhana|goverdhan|gowardhan", "govardhan"],
    ["chopra|chopada|chopdas", "chopda"],
    ["poojan|pujan|pooja|poojah|pujas|pujans|poojas|poojans", "puja"],
    ["laxmi|luxmi|lakshmiji|laxmiji", "lakshmi"],
    ["hanumanji|hanuman ji", "hanuman"],
    ["arti|arati|aarati|aartis|artis", "aarti"],
    ["fire works|fireworks", "firework"],
  ] as const
).map(([words, one]) => [
  new RegExp(
    `(?<= )(?:${words
      .split("|")
      .sort((a, b) => b.length - a.length)
      .join("|")})(?= )`,
    "g",
  ),
  one,
]);

// Words that say nothing about which event it is.
const FILLER = new Set([
  "a",
  "all",
  "an",
  "and",
  "annual",
  "at",
  "by",
  "celebrate",
  "celebrating",
  "celebration",
  "darshan",
  "day",
  "evening",
  "event",
  "festival",
  "for",
  "grand",
  "in",
  "join",
  "mahotsav",
  "mandir",
  "night",
  "of",
  "on",
  "our",
  "programme",
  "program",
  "special",
  "temple",
  "the",
  "to",
  "us",
  "utsav",
  "with",
]);

// Plural to singular, so "bhajans" and "kirtans" match, leaving words
// that only look plural ("dhanteras", "chaudas") alone.
const singular = (w: string) =>
  w.length > 3 && /[^su]s$/.test(w) && !/(as|is)$/.test(w) ? w.slice(0, -1) : w;

export function titleWords(title: string): Set<string> {
  let text = ` ${title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
  for (const [pattern, one] of SPELLINGS) text = text.replace(pattern, one);
  return new Set(
    text
      .split(" ")
      .map(singular)
      .filter((w) => w && !FILLER.has(w) && !/^(19|20)\d\d$/.test(w)),
  );
}

// Minutes between two start times, or null when either is all day.
function minutesApart(a = "", b = ""): number | null {
  if (!a || !b) return null;
  const mins = (t: string) =>
    Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return Math.abs(mins(a) - mins(b));
}

export function compareEvents(a: Comparable, b: Comparable): Verdict {
  if (a.date !== b.date) return "different";
  const x = titleWords(a.title);
  const y = titleWords(b.title);
  const gap = minutesApart(a.time, b.time);
  const shared = [...x].filter((w) => y.has(w)).length;

  if (x.size === y.size && shared === x.size) {
    // The same name at (nearly) the same time, or one says "all day".
    if (gap === null || gap <= 30) return "same";
    // A time typed wrong, or a morning and an evening aarti.
    return gap <= 180 ? "maybe" : "different";
  }
  if (!x.size || !y.size) return "different";
  // One name inside the other ("Annakut", "Nutan Varsh and Annakut"), or
  // most words in common, at about the same time.
  const similar =
    shared === Math.min(x.size, y.size) ||
    shared / new Set([...x, ...y]).size >= 0.5;
  return similar && (gap === null || gap <= 90) ? "maybe" : "different";
}

export function looksTheSame(a: Comparable, b: Comparable): boolean {
  return compareEvents(a, b) !== "different";
}

export type Candidate = Comparable & {
  kind: "event" | "queue";
  id: string;
};

export type Match<C> = C & { verdict: Exclude<Verdict, "different"> };

// The candidates that may be the same as the item, the surest first,
// never the item itself.
export function duplicatesOf<C extends Comparable & { id: string }>(
  item: Comparable & { id: string },
  candidates: readonly C[],
): Match<C>[] {
  return candidates
    .filter((c) => c.id !== item.id)
    .flatMap((c) => {
      const verdict = compareEvents(item, c);
      return verdict === "different" ? [] : [{ ...c, verdict }];
    })
    .sort((a, b) =>
      a.verdict === b.verdict ? 0 : a.verdict === "same" ? -1 : 1,
    );
}

// What the pages say about copies.
export const DUPLICATE_ERRORS = {
  maybe:
    "That may be an event already on the page. Say whether it's the same, or publish it as a different event.",
  cancelled:
    "That event was cancelled on the mandir's page. Discard this, or restore the event if it's on again.",
  duplicate:
    "That event is already on the page, so it wasn't added again. Change the one that's there instead.",
  already: "That event is already on Toran, or already waiting to be checked.",
} as const;

export const MERGED =
  "It was already on the page: anything new it said has been added to that event.";

// "19:30" as "7:30pm"; "" (all day) as "all day".
export function clockLabel(time: string): string {
  if (!time) return "all day";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
