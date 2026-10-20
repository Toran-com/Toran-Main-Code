// What needs a Toran admin's attention (/ops/attention), as the database
// works it out (needs_attention). Pure, so reading the answer is tested on
// its own; anything malformed is left out rather than breaking the page.

type Mandir = { slug: string; name: string; town: string };

export type Attention = {
  unconfirmed: List<
    Mandir & {
      id: string;
      title: string;
      next_at: string;
      confirmed_at: string | null;
      has_committee: boolean;
    }
  >;
  quiet: List<Mandir & { last_added: string | null }>;
  websites: List<
    Mandir & { outcome: string; checked_at: string; notes: string | null }
  >;
  invites: List<Mandir & { expires_at: string }>;
  festival_dates: List<{
    name: string;
    calendar: string | null;
    starts_on: string;
  }>;
  posters: List<
    Mandir & { waiting: number; oldest: string; has_committee: boolean }
  >;
  claims: List<Mandir & { created_at: string }>;
};

export type List<T> = { total: number; items: T[] };

export const ATTENTION_KEYS = [
  "unconfirmed",
  "quiet",
  "websites",
  "invites",
  "festival_dates",
  "posters",
  "claims",
] as const satisfies readonly (keyof Attention)[];

type Row = Record<string, unknown>;

const text = (row: Row, key: string) =>
  typeof row[key] === "string" ? (row[key] as string) : null;

function mandir(row: Row): Mandir | null {
  const slug = text(row, "slug");
  const name = text(row, "name");
  return slug && name ? { slug, name, town: text(row, "town") ?? "" } : null;
}

// One list: its items as `item` reads them, and the total (never fewer
// than the items given).
function list<T>(value: unknown, item: (row: Row) => T | null): List<T> {
  const v = (value ?? {}) as { total?: unknown; items?: unknown };
  const items = (Array.isArray(v.items) ? v.items : [])
    .filter((r): r is Row => !!r && typeof r === "object")
    .flatMap((r) => {
      const read = item(r);
      return read ? [read] : [];
    });
  const total = typeof v.total === "number" ? v.total : 0;
  return { total: Math.max(total, items.length), items };
}

export function readAttention(value: unknown): Attention {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    unconfirmed: list(v.unconfirmed, (r) => {
      const m = mandir(r);
      const id = text(r, "id");
      const title = text(r, "title");
      const next_at = text(r, "next_at");
      return m && id && title && next_at
        ? {
            ...m,
            id,
            title,
            next_at,
            confirmed_at: text(r, "confirmed_at"),
            has_committee: r.has_committee === true,
          }
        : null;
    }),
    quiet: list(v.quiet, (r) => {
      const m = mandir(r);
      return m ? { ...m, last_added: text(r, "last_added") } : null;
    }),
    websites: list(v.websites, (r) => {
      const m = mandir(r);
      const outcome = text(r, "outcome");
      const checked_at = text(r, "checked_at");
      return m && outcome && checked_at
        ? { ...m, outcome, checked_at, notes: text(r, "notes") }
        : null;
    }),
    invites: list(v.invites, (r) => {
      const m = mandir(r);
      const expires_at = text(r, "expires_at");
      return m && expires_at ? { ...m, expires_at } : null;
    }),
    festival_dates: list(v.festival_dates, (r) => {
      const name = text(r, "name");
      const starts_on = text(r, "starts_on");
      return name && starts_on
        ? { name, starts_on, calendar: text(r, "calendar") }
        : null;
    }),
    posters: list(v.posters, (r) => {
      const m = mandir(r);
      const oldest = text(r, "oldest");
      return m && oldest && typeof r.waiting === "number"
        ? {
            ...m,
            oldest,
            waiting: r.waiting,
            has_committee: r.has_committee === true,
          }
        : null;
    }),
    claims: list(v.claims, (r) => {
      const m = mandir(r);
      const created_at = text(r, "created_at");
      return m && created_at ? { ...m, created_at } : null;
    }),
  };
}

// How many things need attention in all.
export function attentionCount(attention: Attention): number {
  return ATTENTION_KEYS.reduce((sum, key) => sum + attention[key].total, 0);
}

// Whole days from one time to another (rounded down), for "waiting 4 days".
export function daysSince(from: string, now: Date = new Date()): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(from).getTime()) / 86_400_000),
  );
}

// How the nightly job (lib/nightly.ts) is doing, from its latest run.
export type NightlyStatus =
  { state: "never" } | { state: "late" | "ok"; ranAt: string; text: string };

// A run more than this long ago means the job has stopped.
const LATE_HOURS = 36;

export function nightlyStatus(
  run: { ran_at: string; summary: unknown } | null,
  now: Date = new Date(),
): NightlyStatus {
  if (!run) return { state: "never" };
  const s = (run.summary ?? {}) as {
    retention?: Record<string, unknown> | null;
    websites?: { checked?: unknown; added?: unknown; failed?: unknown };
  };
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  const deleted = Object.values(s.retention ?? {}).reduce<number>(
    (sum, v) => sum + n(v),
    0,
  );
  const checked = n(s.websites?.checked);
  const added = n(s.websites?.added);
  const failed = n(s.websites?.failed);
  const text = [
    `checked ${checked} ${checked === 1 ? "website" : "websites"}`,
    ...(failed ? [`${failed} couldn't be saved`] : []),
    `${added} new ${added === 1 ? "event" : "events"} to the review queue`,
    s.retention
      ? `${deleted} old ${deleted === 1 ? "record" : "records"} deleted`
      : "the clean-up failed",
  ].join(", ");
  const hours = (now.getTime() - new Date(run.ran_at).getTime()) / 3_600_000;
  return { state: hours > LATE_HOURS ? "late" : "ok", ranAt: run.ran_at, text };
}
