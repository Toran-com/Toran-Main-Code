import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  candidateLinks,
  eventsFromIcs,
  eventsFromJsonLd,
  type FoundEvent,
  robotsAllows,
  upcoming,
} from "@/lib/website-events";
import { siteUrl } from "@/lib/site";

// Reads a mandir's own website for events it publishes in standard forms
// (lib/website-events.ts). Polite and careful: it says who it is, obeys
// robots.txt, reads at most a handful of pages, gives up after a few
// seconds, and never fetches addresses inside a private network (a
// website address is typed in by people, so it can't be trusted).

export const AGENT = "ToranBot";

export type CheckOutcome = "found" | "none" | "blocked" | "unreachable";

export type CheckResult = {
  outcome: CheckOutcome;
  events: FoundEvent[];
  pagesRead: number;
};

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 3;

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
            "text/html,text/calendar,application/xhtml+xml;q=0.9,*/*;q=0.5",
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

// Checks one website: its home page, up to three pages that look like an
// events list, and up to two calendar feeds.
export async function checkWebsite(
  website: string,
  now = new Date(),
): Promise<CheckResult> {
  let home: URL;
  try {
    home = new URL(website);
  } catch {
    return { outcome: "unreachable", events: [], pagesRead: 0 };
  }

  const robots = await fetchText(`${home.origin}/robots.txt`);
  const allowed = (url: string) =>
    !robots || robotsAllows(robots.text, new URL(url).pathname, AGENT);
  if (!allowed(home.toString())) {
    return { outcome: "blocked", events: [], pagesRead: 0 };
  }

  const first = await fetchText(home.toString());
  if (!first) return { outcome: "unreachable", events: [], pagesRead: 0 };

  const found: FoundEvent[] = eventsFromJsonLd(first.text, first.url);
  const { pages, feeds } = candidateLinks(first.text, first.url);
  let pagesRead = 1;
  for (const page of pages.filter(allowed)) {
    const result = await fetchText(page);
    if (!result) continue;
    pagesRead++;
    found.push(...eventsFromJsonLd(result.text, result.url));
    for (const feed of candidateLinks(result.text, result.url).feeds) {
      if (!feeds.includes(feed) && feeds.length < 2) feeds.push(feed);
    }
  }
  for (const feed of feeds.filter(allowed)) {
    const result = await fetchText(feed);
    if (!result || !/BEGIN:VCALENDAR/i.test(result.text)) continue;
    pagesRead++;
    found.push(...eventsFromIcs(result.text, result.url));
  }

  const events = upcoming(found, now);
  return { outcome: events.length ? "found" : "none", events, pagesRead };
}
