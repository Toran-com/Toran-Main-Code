// Reads events a mandir's own website already publishes in machine-readable
// forms: schema.org event data in the page (JSON-LD or microdata), the
// older hCalendar and h-event microformats, iCalendar (.ics) feeds, Google
// Calendars embedded in the page, and the event list of WordPress's The
// Events Calendar plugin. Patrikas and posters (PDFs and pictures) are
// found but not read: they're listed for a person to type up. No guessing
// events from page text; that would need AI. Whatever it reads is
// cleaned into plain text a family can read, then checked by a person in
// the poster queue. Pure functions, so the rules are tested without
// fetching anything.

import { type EventKind, guessKind } from "@/lib/event-kinds";
import { londonDate, londonTime } from "@/lib/format";

export type FoundEvent = {
  title: string;
  date: string; // YYYY-MM-DD in London
  time: string; // HH:MM in London, or "" for all day
  summary: string;
  link: string;
  kind: EventKind;
};

// ---- Cleaning text -----------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  pound: "£",
  copy: "©",
  bull: "•",
  middot: "·",
};

const ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z]+);/gi;

function decodeEntities(text: string): string {
  return text.replace(ENTITY, (whole, name: string) => {
    const lower = name.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower];
    try {
      if (lower.startsWith("#x")) {
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      }
      if (lower.startsWith("#")) {
        return String.fromCodePoint(Number(lower.slice(1)));
      }
    } catch {
      // An impossible code point: leave it as it was.
    }
    return whole;
  });
}

// Plain text from whatever a website put in an event's name or
// description: HTML (even HTML that was encoded twice, so "&lt;p&gt;"
// shows up as tags), escape sequences like "\n" left in by a plugin,
// WordPress shortcodes and "Read more" links. Spaces tidied.
export function plainText(html: string): string {
  let text = html.replace(/\\[nrt]/g, " ").replace(/\\\//g, "/");
  for (let i = 0; i < 2 && /&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(text); i++) {
    text = decodeEntities(text);
  }
  text = text
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/?[a-z][^>]*>/gi, " ");
  text = decodeEntities(text)
    // Shortcodes from page builders: [vc_row], [/et_pb_text], [caption …].
    .replace(
      /\[\/?(?:[a-z]+_[a-z0-9_]*|caption|gallery|embed)(?:\s[^\]]*)?\]/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
  return text
    .replace(/\s*\[(?:…|\.\.\.)\]$/, "…")
    .replace(
      /\s*(?:read more|continue reading|find out more|learn more|more info)\s*[»→›.…]*$/i,
      "",
    )
    .trim();
}

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "with",
]);

// Names written in capitals ("DIWALI MELA") in title case instead.
function tidyTitle(title: string): string {
  const letters = title.replace(/[^a-z]/gi, "");
  if (letters.length < 5 || letters !== letters.toUpperCase()) return title;
  return title
    .toLowerCase()
    .replace(/[a-z][a-z']*/g, (word, at: number) =>
      at > 0 && SMALL_WORDS.has(word)
        ? word
        : word[0].toUpperCase() + word.slice(1),
    );
}

// At most `max` characters: whole sentences if one ends late enough,
// otherwise cut at a word.
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sentence = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  const kept = (space > max / 2 ? cut.slice(0, space) : cut)
    .trimEnd()
    .replace(/[,;:–-]$/, "");
  return `${kept}…`;
}

// The first time of day written in some text: "11:30am", "6.30 pm",
// "7pm", "18:30". "HH:MM", or null.
export function timeIn(text: string): string | null {
  const twelve =
    /\b(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i.exec(
      text,
    );
  if (twelve) {
    let hour = Number(twelve[1]) % 12;
    if (/^p/i.test(twelve[3])) hour += 12;
    const time = `${String(hour).padStart(2, "0")}:${twelve[2] ?? "00"}`;
    return time === "00:00" ? null : time;
  }
  const day = /\b([01]\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (day && `${day[1]}:${day[2]}` !== "00:00") return `${day[1]}:${day[2]}`;
  return null;
}

type RawEvent = {
  title: string;
  date: string;
  time: string;
  summary: string;
  link: string;
};

// A found event made ready for the queue: clean name and description, a
// time (websites often give midnight when they mean "no time", with the
// real time only in the description), and a guess at its kind.
function finish(raw: RawEvent): FoundEvent | null {
  const title = shorten(tidyTitle(plainText(raw.title)), 120);
  if (title.length < 2) return null;
  let summary = plainText(raw.summary);
  if (summary.toLowerCase() === title.toLowerCase()) summary = "";
  summary = shorten(summary, 280);
  const time =
    raw.time && raw.time !== "00:00"
      ? raw.time
      : (timeIn(`${title} ${summary}`) ?? "");
  return {
    title,
    date: raw.date,
    time,
    summary,
    link: raw.link,
    // The name says more than the description.
    kind: guessKind(title) === "other" ? guessKind(summary) : guessKind(title),
  };
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

// ---- Dates -------------------------------------------------------------------

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

// ---- schema.org events in JSON-LD -------------------------------------------

function isEventType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some(
    (t) => typeof t === "string" && /(Event|Festival)$/.test(t),
  );
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return text(value[0]);
  if (value && typeof value === "object" && "rendered" in value) {
    // WordPress's REST API: { rendered: "<p>…</p>" }.
    return text((value as { rendered: unknown }).rendered);
  }
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
      const start =
        typeof obj.startDate === "string" ? parseStart(obj.startDate) : null;
      const event = start
        ? finish({
            title: text(obj.name),
            ...start,
            summary: text(obj.description),
            link: linkOf(obj.url, pageUrl) || pageUrl,
          })
        : null;
      if (event) found.push(event);
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
      // Some plugins leave raw line breaks inside strings, which JSON
      // forbids; outside strings they're only spacing.
      visit(JSON.parse(body.trim().replace(/[\u0000-\u001f]+/g, " ")), 0);
    } catch {
      // A broken block is skipped; the rest of the page may still be fine.
    }
  }
  return found;
}

// ---- schema.org events in microdata -----------------------------------------

// The tag carrying itemprop="<prop>" in a piece of HTML, and the text inside
// it.
function itemProp(
  html: string,
  prop: string,
): { attrs: string; inner: string } | null {
  const tag = new RegExp(
    `<([a-z0-9]+)\\b([^>]*\\bitemprop\\s*=\\s*["'][^"']*\\b${prop}\\b[^"']*["'][^>]*)>`,
    "i",
  ).exec(html);
  if (!tag) return null;
  const rest = html.slice(tag.index + tag[0].length);
  const close = rest.search(new RegExp(`</${tag[1]}\\s*>`, "i"));
  return { attrs: tag[2], inner: close >= 0 ? rest.slice(0, close) : "" };
}

function attr(attrs: string, name: string): string | null {
  return (
    new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(attrs)?.[1] ??
    null
  );
}

// Events marked up with itemtype="https://schema.org/Event".
export function eventsFromMicrodata(
  html: string,
  pageUrl: string,
): FoundEvent[] {
  const found: FoundEvent[] = [];
  const starts = [
    ...html.matchAll(
      /\bitemtype\s*=\s*["']https?:\/\/schema\.org\/\w*(?:Event|Festival)["']/gi,
    ),
  ].map((m) => m.index);
  starts.forEach((start, i) => {
    const chunk = html.slice(start, starts[i + 1] ?? start + 8000);
    const name = itemProp(chunk, "name");
    const when = itemProp(chunk, "startDate");
    const startValue =
      when && (attr(when.attrs, "content") ?? attr(when.attrs, "datetime"));
    const parsed = startValue ? parseStart(startValue) : null;
    if (!name || !parsed) return;
    const description = itemProp(chunk, "description");
    const url = itemProp(chunk, "url");
    const href = url
      ? (attr(url.attrs, "href") ?? attr(url.attrs, "content") ?? "")
      : "";
    const event = finish({
      title: attr(name.attrs, "content") ?? name.inner,
      ...parsed,
      summary: description
        ? (attr(description.attrs, "content") ?? description.inner)
        : "",
      link: (href && absolute(href, pageUrl)) || pageUrl,
    });
    if (event) found.push(event);
  });
  return found;
}

// ---- Microformats: hCalendar and h-event ------------------------------------

// The first tag inside a piece of HTML with one of these classes, and the
// text inside it.
function classProp(
  html: string,
  names: string[],
): { attrs: string; inner: string } | null {
  for (const tag of html.matchAll(/<([a-z0-9]+)\b([^>]*)>/gi)) {
    const classes = attr(tag[2], "class")?.split(/\s+/) ?? [];
    if (!classes.some((c) => names.includes(c))) continue;
    const rest = html.slice(tag.index + tag[0].length);
    const close = rest.search(new RegExp(`</${tag[1]}\\s*>`, "i"));
    return { attrs: tag[2], inner: close >= 0 ? rest.slice(0, close) : "" };
  }
  return null;
}

// Events marked up with the older microformats many WordPress themes and
// calendar plugins still use: class="vevent" (hCalendar) or "h-event",
// with the name in "summary" or "p-name" and the start in "dtstart" or
// "dt-start" (as a datetime or title, or a "value-title" inside).
export function eventsFromMicroformats(
  html: string,
  pageUrl: string,
): FoundEvent[] {
  const found: FoundEvent[] = [];
  const starts = [
    ...html.matchAll(
      /<[a-z0-9]+\b[^>]*\bclass\s*=\s*["'](?:[^"']*\s)?(?:vevent|h-event)(?:\s[^"']*)?["'][^>]*>/gi,
    ),
  ].map((m) => m.index);
  starts.forEach((start, i) => {
    const chunk = html.slice(start, starts[i + 1] ?? start + 8000);
    const inner = chunk.slice(chunk.indexOf(">") + 1);
    const name = classProp(inner, ["summary", "p-name"]);
    const when = classProp(inner, ["dtstart", "dt-start"]);
    if (!name || !when) return;
    const valueTitle =
      /class\s*=\s*["'][^"']*\bvalue-title\b[^"']*["'][^>]*\btitle\s*=\s*["']([^"']+)["']|\btitle\s*=\s*["']([^"']+)["'][^>]*class\s*=\s*["'][^"']*\bvalue-title\b/i.exec(
        when.inner,
      );
    const startValue =
      attr(when.attrs, "datetime") ??
      attr(when.attrs, "title") ??
      attr(when.attrs, "content") ??
      valueTitle?.[1] ??
      valueTitle?.[2] ??
      plainText(when.inner);
    // hCalendar also allows the compact form, "20261112T1800".
    const compact = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/.exec(
      startValue.trim(),
    );
    const parsed = parseStart(
      compact
        ? `${compact[1]}-${compact[2]}-${compact[3]}${compact[4] ? `T${compact[4]}:${compact[5]}` : ""}`
        : startValue,
    );
    if (!parsed) return;
    const description = classProp(inner, [
      "description",
      "p-summary",
      "e-content",
      "p-description",
    ]);
    const url = classProp(inner, ["url", "u-url"]);
    const href = url ? (attr(url.attrs, "href") ?? "") : "";
    const event = finish({
      title: name.inner,
      ...parsed,
      summary: description?.inner ?? "",
      link: (href && absolute(href, pageUrl)) || pageUrl,
    });
    if (event) found.push(event);
  });
  return found;
}

// ---- WordPress: The Events Calendar's list of events ------------------------

// The address of The Events Calendar's list of upcoming events on a
// WordPress site.
export function tribeEventsUrl(origin: string, today: string): string {
  return `${origin}/wp-json/tribe/events/v1/events?per_page=50&start_date=${today}`;
}

// Its answer: { events: [{ title, description, start_date, all_day, url }] },
// with times in the site's own time zone (a UK site: London).
export function eventsFromTribeApi(json: string, base: string): FoundEvent[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const list = (data as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const e = item as Record<string, unknown>;
    const start =
      typeof e.start_date === "string" ? parseStart(e.start_date) : null;
    if (!start) return [];
    const event = finish({
      title: text(e.title),
      date: start.date,
      time: e.all_day === true ? "" : start.time,
      summary: text(e.excerpt) || text(e.description),
      link: linkOf(e.url, base) || base,
    });
    return event ? [event] : [];
  });
}

// ---- iCalendar feeds ---------------------------------------------------------

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
        const event = finish({
          title: unescapeIcs(summary),
          ...start,
          summary: unescapeIcs(current?.DESCRIPTION?.value ?? ""),
          link:
            absolute(unescapeIcs(current?.URL?.value ?? ""), feedUrl) ??
            feedUrl,
        });
        if (event) found.push(event);
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

// ---- Finding what to read next ----------------------------------------------

// Google Calendars shown on the page (an embedded calendar, or a "view our
// calendar" link): each public one has an iCalendar feed.
export function googleCalendarFeeds(html: string): string[] {
  const feeds = new Set<string>();
  const decoded = html.replace(/&amp;/g, "&");
  for (const [, query] of decoded.matchAll(
    /calendar\.google\.com\/calendar\/(?:u\/\d+\/?)?(?:embed|r)?\?([^"'\s<>]+)/gi,
  )) {
    const params = new URLSearchParams(query);
    const ids = [
      ...params.getAll("src"),
      ...params
        .getAll("cid")
        .map((cid) => Buffer.from(cid, "base64").toString("utf8")),
    ];
    for (const id of ids) {
      if (/^[\w.+-]+@[\w.-]+$/.test(id)) {
        feeds.add(
          `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`,
        );
      }
    }
  }
  return [...feeds];
}

const LIST_WORDS =
  /event|calendar|programme|program|what-?s-?on|festival|diary|schedule|upcoming|activities|utsav|timetable/i;

// Links on a page worth reading next: same-site pages that look like an
// events list or calendar, and calendar feeds anywhere (including Google
// Calendars embedded in the page).
export function candidateLinks(
  html: string,
  pageUrl: string,
): { pages: string[]; feeds: string[] } {
  const host = new URL(pageUrl).host;
  const pages = new Set<string>();
  const feeds = new Set<string>();
  for (const [, attrs] of html.matchAll(/<(?:a|link|iframe)\b([^>]*)>/gi)) {
    const href = /\b(?:href|src)\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (!href) continue;
    if (/^webcal:/i.test(href)) {
      feeds.add(href.replace(/^webcal:/i, "https:"));
      continue;
    }
    const url = absolute(href.replace(/&amp;/g, "&"), pageUrl);
    if (!url) continue;
    const isFeed =
      /\.ics(\?|$)/i.test(url) ||
      /[?&](?:ical|outlook-ical)=1\b/i.test(url) ||
      /\/feed\/ical\/?$/i.test(url) ||
      /type\s*=\s*["']text\/calendar/i.test(attrs);
    if (isFeed) {
      feeds.add(url);
      continue;
    }
    const target = new URL(url);
    if (target.host !== host) continue;
    target.hash = "";
    if (LIST_WORDS.test(target.pathname)) pages.add(target.toString());
  }
  for (const feed of googleCalendarFeeds(html)) feeds.add(feed);
  pages.delete(new URL(pageUrl).toString());
  return { pages: [...pages].slice(0, 5), feeds: [...feeds].slice(0, 3) };
}

// Links to single events from an events list ("/events/diwali-2026/"),
// for sites that only describe each event on its own page.
export function eventPageLinks(html: string, pageUrl: string): string[] {
  const host = new URL(pageUrl).host;
  const here = new URL(pageUrl).pathname.replace(/\/$/, "");
  const links = new Set<string>();
  for (const [, href] of html.matchAll(
    /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi,
  )) {
    const url = absolute(href.replace(/&amp;/g, "&"), pageUrl);
    if (!url) continue;
    const target = new URL(url);
    target.hash = "";
    target.search = "";
    const path = target.pathname.replace(/\/$/, "");
    if (
      target.host === host &&
      path !== here &&
      /\/(?:event|events|evento)\/[^/]+$/i.test(path) &&
      !/\/(?:page|category|tag|list|month|week|day|today|feed)\b/i.test(path)
    ) {
      links.add(target.toString());
    }
  }
  return [...links].slice(0, 6);
}

// ---- Patrikas and posters ----------------------------------------------------

// A patrika (programme) or poster the site links to or shows: Toran can't
// read these by itself, so they're listed for a person to type up.
export type FoundDocument = {
  url: string;
  kind: "pdf" | "picture";
  label: string;
};

const PATRIKA_WORDS =
  /patrika|programme|program|schedule|calendar|timetable|newsletter|events?\b|utsav|festival|poster|flyer|leaflet|diwali|deepavali|navratri|navaratri|janmashtami|annakut|holi|shivaratri|ganesh|ram\s*navami|hanuman|sharad|garba|dussehra|vijaya/i;
const NOT_A_POSTER = /logo|icon|favicon|avatar|sprite|banner-bg|placeholder/i;

// PDFs and pictures on a page that look like a programme or event poster:
// by the link's words, the picture's description, or the file's name.
export function patrikaLinks(html: string, pageUrl: string): FoundDocument[] {
  const found = new Map<string, FoundDocument>();
  for (const [, attrs, inner] of html.matchAll(
    /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi,
  )) {
    const href = attr(attrs, "href");
    const url = href && absolute(href.replace(/&amp;/g, "&"), pageUrl);
    if (!url || !/\.pdf(?:[?#]|$)/i.test(url)) continue;
    const words = plainText(inner);
    const file = decodeURIComponent(
      new URL(url).pathname.split("/").pop() ?? "",
    );
    if (!PATRIKA_WORDS.test(`${words} ${file}`)) continue;
    found.set(url, {
      url,
      kind: "pdf",
      label: shorten(words || file.replace(/\.pdf$/i, ""), 80),
    });
  }
  for (const [, attrs] of html.matchAll(/<img\b([^>]*)>/gi)) {
    const src = attr(attrs, "src") ?? attr(attrs, "data-src");
    const url = src && absolute(src.replace(/&amp;/g, "&"), pageUrl);
    if (!url || !/\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(url)) continue;
    const alt = plainText(attr(attrs, "alt") ?? "");
    const file = decodeURIComponent(
      new URL(url).pathname.split("/").pop() ?? "",
    );
    if (NOT_A_POSTER.test(`${alt} ${file}`)) continue;
    if (!PATRIKA_WORDS.test(`${alt} ${file}`)) continue;
    // Small pictures (thumbnails, icons) aren't posters.
    const width = Number(attr(attrs, "width") ?? 0);
    if (width && width < 200) continue;
    if (!found.has(url)) {
      found.set(url, {
        url,
        kind: "picture",
        label: shorten(alt || file.replace(/\.\w+$/, ""), 80),
      });
    }
  }
  return [...found.values()].slice(0, 5);
}

// ---- What kind of site it is ------------------------------------------------

export type Platform =
  | "wordpress"
  | "wix"
  | "squarespace"
  | "weebly"
  | "google-sites"
  | "godaddy"
  | null;

export function platformOf(html: string): Platform {
  if (/wp-content\/|wp-includes\/|api\.w\.org/i.test(html)) return "wordpress";
  if (/static\.wixstatic\.com|wix\.com\/|wix-warmup-data/i.test(html)) {
    return "wix";
  }
  if (/squarespace(?:-cdn)?\.com/i.test(html)) return "squarespace";
  if (/weebly\.com|editmysite\.com/i.test(html)) return "weebly";
  if (/sites\.google\.com|googleusercontent\.com\/sites/i.test(html)) {
    return "google-sites";
  }
  if (/img1\.wsimg\.com/i.test(html)) return "godaddy";
  return null;
}

// Whether the page names a few dates in its ordinary text: events written
// out for people, which Toran can't read without AI.
export function mentionsDates(html: string): boolean {
  const words = plainText(html);
  const months =
    "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
  const dates = words.match(
    new RegExp(
      `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${months})\\b|\\b(?:${months})\\s+\\d{1,2}(?:st|nd|rd|th)?\\b|\\b\\d{1,2}[/.]\\d{1,2}[/.](?:20)?\\d{2}\\b`,
      "gi",
    ),
  );
  return (dates?.length ?? 0) >= 2;
}

// ---- Choosing what to keep --------------------------------------------------

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

// ---- robots.txt --------------------------------------------------------------

// The rules for our user agent if it's named, otherwise for everyone ("*").
// The longest matching rule wins; Allow wins a tie.
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
