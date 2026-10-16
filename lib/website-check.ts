import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { londonDate } from "@/lib/format";
import {
  candidateLinks,
  eventPageLinks,
  eventsFromIcs,
  eventsFromJsonLd,
  eventsFromMicrodata,
  eventsFromTribeApi,
  type FoundEvent,
  mentionsDates,
  type Platform,
  platformOf,
  robotsAllows,
  tribeEventsUrl,
  upcoming,
} from "@/lib/website-events";
import { siteUrl } from "@/lib/site";

// Reads a mandir's own website for events it publishes in standard forms
// (lib/website-events.ts). Polite and careful: it says who it is, obeys
// robots.txt, reads at most about a dozen pages and feeds, gives up after
// a few seconds a page, and never fetches addresses inside a private
// network (a website address is typed in by people, so it can't be
// trusted).

export const AGENT = "ToranBot";

export type CheckOutcome = "found" | "none" | "blocked" | "unreachable";

export type CheckResult = {
  outcome: CheckOutcome;
  events: FoundEvent[];
  pagesRead: number;
  // What was read and, if nothing was found, why: shown on /ops/websites.
  notes: string[];
};

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const SITE_BUDGET_MS = 25_000;

// Private, loopback and link-local addresses, IPv4 and IPv6.
export function isPrivateAddress(address: string): boolean {
  const v4 = /^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/i.exec(address);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe8") ||
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb")
  );
}

async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(local|internal|localhost)$/i.test(host)) {
    return false;
  }
  if (isIP(host)) return !isPrivateAddress(host);
  try {
    const addresses = await lookup(host, { all: true });
    return (
      addresses.length > 0 &&
      addresses.every((a) => !isPrivateAddress(a.address))
    );
  } catch {
    return false;
  }
}

async function readLimited(response: Response): Promise<string | null> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

// Fetches a public web page or feed as text, following a few redirects
// (each checked again). Null if it can't, or shouldn't.
async function fetchText(
  url: string,
): Promise<{ url: string; text: string } | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return null;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return null;
    }
    if (!(await isPublicHost(target.hostname))) return null;
    let response: Response;
    try {
      response = await fetch(target, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": `${AGENT}/0.1 (+${siteUrl()}/demo)`,
          accept:
            "text/html,text/calendar,application/json;q=0.9,application/xhtml+xml;q=0.9,*/*;q=0.5",
        },
      });
    } catch {
      return null;
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) return null;
      current = new URL(next, target).toString();
      continue;
    }
    if (!response.ok) return null;
    const text = await readLimited(response).catch(() => null);
    return text === null ? null : { url: target.toString(), text };
  }
  return null;
}

// Plain-English notes on a check, for Toran's admins: what was read, and
// why nothing was found when that's the case.
function describe(
  platform: Platform,
  read: { pages: number; feeds: number; tribe: boolean; google: boolean },
  found: number,
  writtenOut: boolean,
): string[] {
  const notes: string[] = [];
  const pages = `${read.pages} ${read.pages === 1 ? "page" : "pages"}`;
  const feeds = read.feeds
    ? ` and ${read.feeds} calendar ${read.feeds === 1 ? "feed" : "feeds"}`
    : "";
  notes.push(`Read ${pages}${feeds}.`);
  if (read.tribe) {
    notes.push(
      "Built with WordPress and The Events Calendar: read its list of events.",
    );
  }
  if (read.google) notes.push("Read the Google Calendar shown on the site.");
  if (found) return notes;
  if (platform === "wix") {
    notes.push(
      "Built with Wix, whose event lists load inside the browser, so Toran can't read them yet.",
    );
  } else if (platform === "squarespace" || platform === "weebly") {
    notes.push(
      "Built with a site builder that doesn't publish event data Toran can read.",
    );
  }
  notes.push(
    writtenOut
      ? "The site writes dates out for people (on a page or in a poster picture) but publishes no event data. Ask the committee to add events on Toran, or forward their posters."
      : "No events found on the pages read.",
  );
  return notes;
}

// Checks one website: its home page and up to five pages that look like an
// events list, then the event data they lead to: calendar feeds, Google
// Calendars, WordPress's The Events Calendar, and single event pages.
// Stops after about 25 seconds.
export async function checkWebsite(
  website: string,
  now = new Date(),
): Promise<CheckResult> {
  let home: URL;
  try {
    home = new URL(website);
  } catch {
    return unreachable();
  }
  const deadline = Date.now() + SITE_BUDGET_MS;
  const inTime = () => Date.now() < deadline;

  const robots = await fetchText(`${home.origin}/robots.txt`);
  const allowed = (url: string) =>
    !robots || robotsAllows(robots.text, new URL(url).pathname, AGENT);
  if (!allowed(home.toString())) {
    return {
      outcome: "blocked",
      events: [],
      pagesRead: 0,
      notes: [
        "The site's robots.txt asks robots not to read it, so Toran stays away.",
      ],
    };
  }

  const first = await fetchText(home.toString());
  if (!first) return unreachable();

  const found: FoundEvent[] = [];
  const read = { pages: 1, feeds: 0, tribe: false, google: false };
  const fromPage = (html: string, url: string) => [
    ...eventsFromJsonLd(html, url),
    ...eventsFromMicrodata(html, url),
  ];
  found.push(...fromPage(first.text, first.url));
  const platform = platformOf(first.text);
  let writtenOut = mentionsDates(first.text);
  const { pages, feeds } = candidateLinks(first.text, first.url);
  const singles = new Set<string>(eventPageLinks(first.text, first.url));

  // WordPress sites with The Events Calendar list their events at a fixed
  // address, whatever their pages look like.
  if (platform === "wordpress") {
    const url = tribeEventsUrl(new URL(first.url).origin, londonDate(now));
    if (allowed(url)) {
      const result = await fetchText(url);
      const events = result ? eventsFromTribeApi(result.text, first.url) : [];
      if (events.length) {
        read.tribe = true;
        found.push(...events);
      }
    }
  }

  for (const page of pages.filter(allowed)) {
    if (!inTime()) break;
    const result = await fetchText(page);
    if (!result) continue;
    read.pages++;
    found.push(...fromPage(result.text, result.url));
    writtenOut ||= mentionsDates(result.text);
    for (const feed of candidateLinks(result.text, result.url).feeds) {
      if (!feeds.includes(feed) && feeds.length < 3) feeds.push(feed);
    }
    for (const single of eventPageLinks(result.text, result.url)) {
      singles.add(single);
    }
  }

  for (const feed of feeds.filter(allowed)) {
    if (!inTime()) break;
    const result = await fetchText(feed);
    if (!result || !/BEGIN:VCALENDAR/i.test(result.text)) continue;
    read.feeds++;
    if (/calendar\.google\.com/.test(feed)) read.google = true;
    found.push(...eventsFromIcs(result.text, result.url));
  }

  // Some sites describe each event only on its own page.
  if (!upcoming(found, now).length) {
    for (const single of [...singles].filter(allowed).slice(0, 6)) {
      if (!inTime()) break;
      const result = await fetchText(single);
      if (!result) continue;
      read.pages++;
      found.push(...fromPage(result.text, result.url));
    }
  }

  const events = upcoming(found, now);
  return {
    outcome: events.length ? "found" : "none",
    events,
    pagesRead: read.pages + read.feeds,
    notes: describe(platform, read, events.length, writtenOut),
  };
}

function unreachable(): CheckResult {
  return {
    outcome: "unreachable",
    events: [],
    pagesRead: 0,
    notes: ["The site didn't answer, or answered with an error."],
  };
}
