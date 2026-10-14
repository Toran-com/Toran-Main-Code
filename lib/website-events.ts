// Reads events a mandir's own website already publishes in standard,
// machine-readable forms: schema.org event data embedded in the page
// (JSON-LD) and iCalendar (.ics) feeds. No guessing from page text; that
// would need AI and is a later step. Pure functions, so the rules are
// tested without fetching anything.

import { londonDate, londonTime } from "@/lib/format";

export type FoundEvent = {
  title: string;
  date: string; // YYYY-MM-DD in London
  time: string; // HH:MM in London, or "" for all day
  summary: string;
  link: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

// Plain text from a snippet of HTML: tags removed, common entities decoded,
// spaces tidied.
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (whole, name: string) => {
      const lower = name.toLowerCase();
      if (lower in ENTITIES) return ENTITIES[lower];
      if (lower.startsWith("#x")) {
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith("#")) {
        return String.fromCodePoint(Number(lower.slice(1)));
      }
      return whole;
    })
    .replace(/\s+/g, " ")
    .trim();
}

// At most 280 characters, cut at a word.
function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function absolute(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

// A start written as a date ("2026-11-08"), a time with an offset
// ("2026-11-08T18:30:00+00:00") or a local time with none (taken as
// London, where these mandirs are).
export function parseStart(
  value: string,
): { date: string; time: string } | null {
  const v = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (dateOnly) return { date: v, time: "" };
  const local =
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(v);
  if (local) return { date: local[1], time: `${local[2]}:${local[3]}` };
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) return null;
  const at = new Date(v);
  if (Number.isNaN(at.getTime())) return null;
  return { date: londonDate(at), time: londonTime(at) };
}

function isEventType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (t) => typeof t === "string" && /(Event|Festival)$/.test(t),
  );
}

function text(value: unknown): string {
  if (typeof value === "string") return plainText(value);
  if (Array.isArray(value)) return text(value[0]);
  return "";
}

function linkOf(value: unknown, base: string): string {
  if (typeof value === "string") return absolute(value, base) ?? "";
  if (value && typeof value === "object" && "url" in value) {
    return linkOf((value as { url: unknown }).url, base);
  }
  return "";
}

// Every schema.org event in the page's JSON-LD blocks, wherever it sits
// (top level, in a list, in "@graph", or under an organisation's "event").
export function eventsFromJsonLd(html: string, pageUrl: string): FoundEvent[] {
  const found: FoundEvent[] = [];
  const blocks = html.matchAll(
    /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi,
  );
  const visit = (node: unknown, depth: number) => {
    if (depth > 6 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (isEventType(obj["@type"])) {
      const title = text(obj.name);
      const start =
        typeof obj.startDate === "string" ? parseStart(obj.startDate) : null;
      if (title && start) {
        found.push({
          title: shorten(title, 120),
          ...start,
          summary: shorten(text(obj.description), 280),
          link: linkOf(obj.url, pageUrl) || pageUrl,
        });
      }
    }
    for (const key of [
      "@graph",
      "event",
      "events",
      "subEvent",
      "itemListElement",
      "item",
    ]) {
      if (key in obj) visit(obj[key], depth + 1);
    }
  };
  for (const [, body] of blocks) {
    try {
      visit(JSON.parse(body.trim()), 0);
    } catch {
      // A broken block is skipped; the rest of the page may still be fine.
    }
  }
  return found;
}

// iCalendar text: long lines are folded onto the next line with a leading
// space, and commas, semicolons and new lines are escaped.
function unfold(ics: string): string[] {
  return ics
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n");
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, " ")
    .replace(/\\([,;\\])/g, "$1")
    .trim();
}

// DTSTART;VALUE=DATE:20261108, DTSTART:20261108T183000Z, or
// DTSTART;TZID=Europe/London:20261108T183000 (local times taken as London).
export function parseIcsStart(
  params: string,
  value: string,
): { date: string; time: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?$/.exec(
    value.trim(),
  );
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (!m[4] || /VALUE=DATE(?!-)/i.test(params)) return { date, time: "" };
  if (m[6]) {
    const at = new Date(`${date}T${m[4]}:${m[5]}:00Z`);
    return { date: londonDate(at), time: londonTime(at) };
  }
  return { date, time: `${m[4]}:${m[5]}` };
}

export function eventsFromIcs(ics: string, feedUrl: string): FoundEvent[] {
  const found: FoundEvent[] = [];
  let current: Record<string, { params: string; value: string }> | null = null;
  for (const line of unfold(ics)) {
    if (/^BEGIN:VEVENT/i.test(line)) {
      current = {};
      continue;
    }
    if (/^END:VEVENT/i.test(line)) {
      const summary = current?.SUMMARY?.value;
      const start = current?.DTSTART
        ? parseIcsStart(current.DTSTART.params, current.DTSTART.value)
        : null;
      if (
        summary &&
        start &&
        !/CANCELLED/i.test(current?.STATUS?.value ?? "")
      ) {
        found.push({
          title: shorten(unescapeIcs(summary), 120),
          ...start,
          summary: shorten(unescapeIcs(current?.DESCRIPTION?.value ?? ""), 280),
          link:
            absolute(unescapeIcs(current?.URL?.value ?? ""), feedUrl) ??
            feedUrl,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
    if (m) current[m[1].toUpperCase()] = { params: m[2], value: m[3] };
  }
  return found;
}

// Links on a page worth reading next: same-site pages that look like an
// events list or calendar, and calendar feeds anywhere.
export function candidateLinks(
  html: string,
  pageUrl: string,
): { pages: string[]; feeds: string[] } {
  const host = new URL(pageUrl).host;
  const pages = new Set<string>();
  const feeds = new Set<string>();
  for (const [, attrs] of html.matchAll(/<(?:a|link)\b([^>]*)>/gi)) {
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!href) continue;
    if (/^webcal:/i.test(href)) {
      feeds.add(href.replace(/^webcal:/i, "https:"));
      continue;
    }
    const url = absolute(href.replace(/&amp;/g, "&"), pageUrl);
    if (!url) continue;
    const isFeed =
      /\.ics(\?|$)/i.test(url) || /type\s*=\s*["']text\/calendar/i.test(attrs);
    if (isFeed) {
      feeds.add(url);
      continue;
    }
    const target = new URL(url);
    if (target.host !== host) continue;
    target.hash = "";
    if (
      /event|calendar|programme|program|what-?s-?on|festival|diary|schedule/i.test(
        target.pathname,
      )
    ) {
      pages.add(target.toString());
    }
  }
  pages.delete(new URL(pageUrl).toString());
  return { pages: [...pages].slice(0, 3), feeds: [...feeds].slice(0, 2) };
}

// Upcoming events only (today to two years ahead), one per title and day.
export function upcoming(events: FoundEvent[], now = new Date()): FoundEvent[] {
  const today = londonDate(now);
  const latest = londonDate(new Date(now.getTime() + 2 * 366 * 86_400_000));
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.title.toLowerCase()}|${e.date}`;
    if (e.date < today || e.date > latest || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// robots.txt: the rules for our user agent if it's named, otherwise for
// everyone ("*"). The longest matching rule wins; Allow wins a tie.
export function robotsAllows(
  robotsTxt: string,
  path: string,
  agent: string,
): boolean {
  type Group = { agents: string[]; rules: { allow: boolean; path: string }[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      // "Disallow:" with nothing after it allows everything.
      if (value) current.rules.push({ allow: field === "allow", path: value });
    }
  }
  const name = agent.toLowerCase();
  const group =
    groups.find((g) => g.agents.some((a) => a !== "*" && name.includes(a))) ??
    groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of group.rules) {
    const pattern = new RegExp(
      `^${rule.path
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\\\$$/, "$")}`,
    );
    if (!pattern.test(path)) continue;
    const length = rule.path.length;
    if (
      !best ||
      length > best.length ||
      (length === best.length && rule.allow)
    ) {
      best = { allow: rule.allow, length };
    }
  }
  return best ? best.allow : true;
}
