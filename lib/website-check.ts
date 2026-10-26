import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { londonDate } from "@/lib/format";
import {
  candidateLinks,
  eventPageLinks,
  eventsFromIcs,
  eventsFromJsonLd,
  eventsFromMicrodata,
  eventsFromMicroformats,
  eventsFromTribeApi,
  type FoundDocument,
  type FoundEvent,
  mentionsDates,
  patrikaLinks,
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
  // Patrikas and posters linked or shown on the pages read, for a person
  // to type up (Toran can't read them itself).
  documents: FoundDocument[];
  pagesRead: number;
  // What was read and, if nothing was found, why: shown on /ops/websites.
  notes: string[];
};

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;
const SITE_BUDGET_MS = 25_000;

// Addresses that aren't on the public internet: private networks,
// loopback, link-local (including cloud metadata at 169.254.169.254),
// shared, benchmarking, multicast and reserved, plus the IPv6 forms that
// carry an IPv4 address inside them (NAT64, 6to4, Teredo). Node checks
// IPv4-mapped IPv6 addresses (::ffff:7f00:1 is 127.0.0.1) against the
// IPv4 rules.
const NOT_PUBLIC = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  NOT_PUBLIC.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  NOT_PUBLIC.addSubnet(network, prefix, "ipv6");
}

// True for an address Toran must never fetch from, and for anything that
// isn't an address at all.
export function isPrivateAddress(address: string): boolean {
  const plain = address.replace(/%.*$/, "");
  const kind = isIP(plain);
  if (kind === 4) return NOT_PUBLIC.check(plain, "ipv4");
  if (kind === 6) return NOT_PUBLIC.check(plain, "ipv6");
  return true;
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
  documents: number,
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
  if (documents) {
    notes.push(
      `Found ${documents} ${documents === 1 ? "patrika or poster" : "patrikas or posters"} to type up.`,
    );
  }
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
  if (documents) return notes;
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
// Patrikas and posters on the pages read are noted too (at most five).
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
      documents: [],
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
  const documents = new Map<string, FoundDocument>();
  const fromPage = (html: string, url: string) => {
    for (const d of patrikaLinks(html, url)) {
      if (documents.size < 5 && !documents.has(d.url)) {
        documents.set(d.url, d);
      }
    }
    return [
      ...eventsFromJsonLd(html, url),
      ...eventsFromMicrodata(html, url),
      ...eventsFromMicroformats(html, url),
    ];
  };
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
    documents: [...documents.values()],
    pagesRead: read.pages + read.feeds,
    notes: describe(platform, read, events.length, writtenOut, documents.size),
  };
}

function unreachable(): CheckResult {
  return {
    outcome: "unreachable",
    events: [],
    documents: [],
    pagesRead: 0,
    notes: ["The site didn't answer, or answered with an error."],
  };
}
