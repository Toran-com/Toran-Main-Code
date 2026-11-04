import type Anthropic from "@anthropic-ai/sdk";
import type { EventInput } from "@/lib/event-form";
import { EVENT_KINDS, isEventKind } from "@/lib/event-kinds";
import { posterReadingOn, readPoster } from "@/lib/poster-reader";

// "Watch AI read a poster" (/demo/poster): anyone can see Claude read one
// of three made-up posters from the sample mandir into draft events, the
// same way Toran reads a real one (lib/poster-reader.ts). Visitors can't
// send their own pictures (decision 0018): only these posters, which
// Toran made, are ever read, so no one's personal data is sent anywhere,
// and each is read at most once a day, so it costs pennies.

export type DemoPoster = {
  id: string;
  name: string;
  about: string;
  alt: string;
  // Private details printed on the poster that the reading must leave
  // out (decision 0006). The names and numbers are made up: 07700 900xxx
  // numbers are kept for drama and never belong to anyone.
  privateDetails: { what: string; text: string[] }[];
  // The poster is read as if it were this day, when it went up, so its
  // events never fall into the past and the demo keeps working.
  readOn: string;
};

export const DEMO_POSTERS: DemoPoster[] = [
  {
    id: "holi",
    name: "Holi poster",
    about: "In English, with a volunteer's name and phone number on it",
    alt: "A colourful Holi poster from Shree Sample Mandir, Anytown: Holika Dahan on Sunday 21 March 2027 at 7.30pm, and a Holi colours celebration on Saturday 27 March 2027 from 11am to 3pm. It asks stallholders to call Rameshbhai Patel on 07700 900123.",
    privateDetails: [
      {
        what: "Rameshbhai Patel's name and phone number",
        text: ["Ramesh", "Rameshbhai", "Patel", "07700", "900123"],
      },
    ],
    readOn: "2027-02-01",
  },
  {
    id: "patrika",
    name: "Gujarati patrika",
    about: "Only in Gujarati, with three festivals and a contact",
    alt: "A programme in Gujarati from Shree Sample Mandir: Maha Shivaratri on Saturday 6 March 2027 at 8pm, Ram Navami on Thursday 15 April 2027 at 12 noon, and Hanuman Jayanti on Tuesday 20 April 2027 at 7pm. The contact is Minaben Shah.",
    privateDetails: [
      {
        what: "Minaben Shah's name and phone number",
        text: [
          "Mina",
          "Minaben",
          "Shah",
          "મીનાબેન",
          "શાહ",
          "07700",
          "900456",
          "૦૭૭૦૦",
          "૯૦૦૪૫૬",
        ],
      },
    ],
    readOn: "2027-02-01",
  },
  {
    id: "hours",
    name: "Darshan times",
    about: "Times for every day, but no dated events",
    alt: "A notice of Shree Sample Mandir's darshan and aarti times every day: mangla aarti at 7am, rajbhog aarti at noon and sandhya aarti at 7pm.",
    privateDetails: [],
    readOn: "2027-02-01",
  },
];

export function demoPoster(id: string): DemoPoster | undefined {
  return DEMO_POSTERS.find((p) => p.id === id);
}

export type DemoDraft = {
  title: string;
  titleGu: string;
  when: string;
  summary: string;
  kind: string;
};

export type DemoReading =
  | {
      ok: true;
      drafts: DemoDraft[];
      seconds: number;
      // What was on the poster but left out of every draft, and anything
      // that wasn't (which the person checking would then remove).
      leftOut: string[];
      keptIn: string[];
      readAt: string;
    }
  | { ok: false; error: "off" | "busy" | "refused" | "failed" | "unknown" };

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// "Sunday 21 March 2027 · 7:30pm", or just the day when there's no time.
export function draftWhen(date: string, time: string): string {
  const day = dayFormat.format(new Date(`${date}T12:00:00Z`)).replace(",", "");
  if (!time) return day;
  const [hour, minute] = time.split(":").map(Number);
  const clock = `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
  return `${day} · ${clock}`;
}

export function toDrafts(events: EventInput[]): DemoDraft[] {
  return events.map((e) => ({
    title: e.title,
    titleGu: e.title_gu ?? "",
    when: draftWhen(e.date, e.time),
    summary: e.summary,
    kind:
      e.kind && isEventKind(e.kind) ? EVENT_KINDS[e.kind] : EVENT_KINDS.other,
  }));
}

// Which of the poster's private details were left out of every draft.
export function checkPrivacy(
  poster: DemoPoster,
  events: EventInput[],
): { leftOut: string[]; keptIn: string[] } {
  const said = events
    .flatMap((e) => [e.title, e.title_gu, e.summary, e.summary_gu])
    .filter(Boolean)
    .join("\n");
  // Whole words in English ("Mina" isn't in "seminar"); Gujarati as is.
  const mentions = (text: string) =>
    /^[\x20-\x7e]+$/.test(text)
      ? new RegExp(
          `\\b${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(said)
      : said.includes(text);
  const leftOut: string[] = [];
  const keptIn: string[] = [];
  for (const detail of poster.privateDetails) {
    const found = detail.text.some(mentions);
    (found ? keptIn : leftOut).push(detail.what);
  }
  return { leftOut, keptIn };
}

// A safety net under the daily cache: at most this many readings an hour
// from one server, whatever happens to the cache.
const HOURLY_LIMIT = 12;
const recent: number[] = [];

export function underLimit(now: number): boolean {
  while (recent.length && recent[0] < now - 3_600_000) recent.shift();
  if (recent.length >= HOURLY_LIMIT) return false;
  recent.push(now);
  return true;
}

export async function readDemoPoster(
  id: string,
  picture: (poster: DemoPoster) => Promise<Buffer>,
  options: {
    client?: Pick<Anthropic, "beta">;
    now?: () => number;
  } = {},
): Promise<DemoReading> {
  const poster = demoPoster(id);
  if (!poster) return { ok: false, error: "unknown" };
  if (!options.client && !posterReadingOn()) return { ok: false, error: "off" };
  const now = options.now ?? Date.now;
  if (!underLimit(now())) return { ok: false, error: "busy" };
  const started = now();
  const result = await readPoster(
    { data: await picture(poster), type: "image/jpeg" },
    { mandir: "Shree Sample Mandir, Anytown", today: poster.readOn },
    options.client,
  );
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    drafts: toDrafts(result.events),
    seconds: Math.round((now() - started) / 100) / 10,
    ...checkPrivacy(poster, result.events),
    readAt: new Date(now()).toISOString(),
  };
}

export function _resetLimitForTests() {
  recent.length = 0;
}
