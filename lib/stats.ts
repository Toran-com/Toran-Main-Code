// Toran's own visit counter: how many times each public page was seen, and
// how often events were added to calendars or shared, per day. No cookies
// and nothing about the visitor (no IP address, browser or device): only
// the page's address and a running total (decision 0015). Pure, so the
// rules are tested on their own.

export const METRICS = ["view", "calendar", "subscribe", "share"] as const;
export type Metric = (typeof METRICS)[number];

export function isMetric(value: unknown): value is Metric {
  return (
    typeof value === "string" && (METRICS as readonly string[]).includes(value)
  );
}

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";
const ID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The public pages worth counting, and what to call each kind.
const PAGES: [RegExp, string][] = [
  [/^\/$/, "Home"],
  [/^\/whats-on$/, "What's on"],
  [/^\/mandirs$/, "Mandir list and map"],
  [new RegExp(`^/mandirs/${SLUG}$`), "Mandir pages"],
  [new RegExp(`^/mandirs/${SLUG}/events/${ID}$`), "Event pages"],
  [new RegExp(`^/mandirs/${SLUG}/events/${ID}/seva$`), "Seva sign-up pages"],
  [/^\/festivals$/, "Festival dates"],
  [/^\/diwali$/, "Diwali page"],
  [new RegExp(`^/festivals/${SLUG}$`), "Festival pages"],
  [/^\/for-mandirs$/, "For mandirs"],
  [/^\/for-mandirs\/guide$/, "Committee guide"],
  [/^\/demo$/, "Demo"],
];

// A page's address as counted: no query or fragment, no trailing slash, and
// only public pages (null for anything else, such as /manage or /ops).
export function countablePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 200) return null;
  let path = value.split(/[?#]/)[0].toLowerCase();
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return PAGES.some(([pattern]) => pattern.test(path)) ? path : null;
}

export function pageKind(path: string): string {
  return PAGES.find(([pattern]) => pattern.test(path))?.[1] ?? "Other";
}

// The mandir a counted page belongs to, if any.
export function mandirSlugOf(path: string): string | null {
  return new RegExp(`^/mandirs/(${SLUG})(?:/|$)`).exec(path)?.[1] ?? null;
}

// Search engines, link previews and test browsers aren't visitors.
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse|headless|curl|wget|python|node-fetch|axios|go-http/i.test(
    userAgent,
  );
}

// What the database adds up for a period (daily_count_summary): totals
// per day and metric, and per page and metric.
export type CountSummary = {
  days: { day: string; metric: string; count: number }[];
  paths: { path: string; metric: string; count: number }[];
};

export type StatsSummary = {
  totals: Record<Metric, number>;
  // Views by kind of page, most first.
  byKind: { kind: string; views: number }[];
  // Views per day, every day in the period (zero when none).
  byDay: { day: string; views: number }[];
  // Per mandir (its own page and its events), most viewed first.
  byMandir: {
    slug: string;
    views: number;
    calendar: number;
    subscribe: number;
    share: number;
  }[];
  // Event pages, most viewed first.
  byEvent: { path: string; views: number }[];
};

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

// The days of a period ending today: ["2026-10-12", …, "2026-10-18"].
export function periodDays(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, i - days + 1));
}

// Reads the database's answer, ignoring anything malformed.
export function readSummary(value: unknown): CountSummary {
  const list = (key: string) => {
    const v = (value as Record<string, unknown> | null)?.[key];
    return Array.isArray(v) ? v : [];
  };
  const ok = (r: unknown): r is Record<string, unknown> =>
    !!r &&
    typeof r === "object" &&
    typeof (r as { count?: unknown }).count === "number";
  return {
    days: list("days")
      .filter(ok)
      .map((r) => ({
        day: String(r.day),
        metric: String(r.metric),
        count: Number(r.count),
      })),
    paths: list("paths")
      .filter(ok)
      .map((r) => ({
        path: String(r.path),
        metric: String(r.metric),
        count: Number(r.count),
      })),
  };
}

export function summarise(input: CountSummary, days: string[]): StatsSummary {
  const totals: Record<Metric, number> = {
    view: 0,
    calendar: 0,
    subscribe: 0,
    share: 0,
  };
  const perDay = new Map(days.map((day) => [day, 0]));
  for (const row of input.days) {
    if (!isMetric(row.metric) || !perDay.has(row.day)) continue;
    totals[row.metric] += row.count;
    if (row.metric === "view")
      perDay.set(row.day, perDay.get(row.day)! + row.count);
  }

  const kinds = new Map<string, number>();
  const mandirs = new Map<string, StatsSummary["byMandir"][number]>();
  const events = new Map<string, number>();
  for (const row of input.paths) {
    if (!isMetric(row.metric)) continue;
    const slug = mandirSlugOf(row.path);
    if (slug) {
      const m = mandirs.get(slug) ?? {
        slug,
        views: 0,
        calendar: 0,
        subscribe: 0,
        share: 0,
      };
      m[row.metric === "view" ? "views" : row.metric] += row.count;
      mandirs.set(slug, m);
    }
    if (row.metric !== "view") continue;
    const kind = pageKind(row.path);
    kinds.set(kind, (kinds.get(kind) ?? 0) + row.count);
    if (kind === "Event pages") {
      events.set(row.path, (events.get(row.path) ?? 0) + row.count);
    }
  }

  const most = <T extends { views: number }>(a: T, b: T) => b.views - a.views;
  return {
    totals,
    byKind: [...kinds].map(([kind, views]) => ({ kind, views })).sort(most),
    byDay: [...perDay].map(([day, views]) => ({ day, views })),
    byMandir: [...mandirs.values()].sort(
      (a, b) =>
        b.views - a.views ||
        b.calendar + b.share - (a.calendar + a.share) ||
        a.slug.localeCompare(b.slug),
    ),
    byEvent: [...events].map(([path, views]) => ({ path, views })).sort(most),
  };
}
