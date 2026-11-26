import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { knownFor } from "@/lib/duplicate-check";
import { checkEvent } from "@/lib/event-form";
import { saveEvent } from "@/lib/event-store";
import { londonDate } from "@/lib/london";
import { queueRead } from "@/lib/poster-queue";
import {
  isPosterType,
  MAX_POSTER_BYTES,
  posterReadingOn,
  readPoster,
} from "@/lib/poster-reader";
import {
  checkWebsite,
  fetchDocument,
  type CheckResult,
} from "@/lib/website-check";
import { newEvents, recordWebsiteCheck } from "@/lib/website-claims";
import type { FoundEvent } from "@/lib/website-events";

// "Connect your website" (decision 0032): a committee presses one button
// and Toran keeps the mandir's page in step with its own website, every
// night, with no keys and no web developer. What the website publishes as
// data (a calendar feed, an events plugin, event markup) goes live
// straight away when the committee says so, as confirmed by the mandir;
// otherwise it waits for them to check. Posters and patrikas on the site
// are read with AI, once each, and always wait to be checked. Sites with
// nothing Toran can read get the forwarding address and a way to ask
// Toran for help instead.

type Db = SupabaseClient<Database>;

// Posters read from one website in one go: each takes a while, and costs.
export const POSTERS_PER_SITE = 2;

export type Connection = {
  mandir_id: string;
  website: string;
  auto_publish: boolean;
  read_posters: boolean;
};

export type ConnectedMandir = {
  id: string;
  slug: string;
  name: string;
  town: string;
};

// What a committee types: their website's address, tidied ("www.x.org"
// becomes "https://www.x.org/"), or null if it isn't one.
export function websiteAddress(value: string): string | null {
  let text = value.trim();
  if (!text || /\s/.test(text) || text.length > 500) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.username || url.password) return null;
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// A calendar's address rather than a website's: those are read with the
// calendar reader instead ("Your calendar").
export function isCalendarAddress(value: string): boolean {
  return (
    /^webcals?:\/\//i.test(value.trim()) ||
    /calendar\.google\.com|outlook\.(live|office|office365)\.com\/owa\/calendar|\.ics(\?|$)/i.test(
      value,
    )
  );
}

export type SyncSummary = {
  outcome: CheckResult["outcome"];
  // Events the website lists, how many went live, and how many wait to
  // be checked.
  found: number;
  published: number;
  queued: number;
  // Posters and patrikas on the site, and how many were read this time.
  posters: number;
  postersRead: number;
  postersAdded: number;
  // Posters still to read (left for next time).
  postersLeft: FoundDocumentRef[];
};

type FoundDocumentRef = { url: string };

// Reads the website once: publishes (or queues) what it lists, and notes
// how it went on the connection. Posters are read separately
// (readWebsitePosters), so a committee isn't kept waiting for them.
export async function syncWebsite(
  db: Db,
  mandir: ConnectedMandir,
  connection: Connection,
  {
    check = checkWebsite,
    now = new Date(),
  }: { check?: typeof checkWebsite; now?: Date } = {},
): Promise<SyncSummary> {
  const result = await check(connection.website, now);
  let published = 0;
  if (connection.auto_publish && result.events.length) {
    published = await publishFound(db, mandir.id, result.events, now);
  }
  // Whatever wasn't published waits to be checked, as from any website
  // check; already listed or waiting ones are left out.
  const saved = await recordWebsiteCheck(
    db,
    { id: mandir.id, website: connection.website },
    result,
  );
  const queued = saved?.added ?? 0;

  const unread = await unreadPosters(db, mandir.id, result.documents);
  await db
    .from("website_connections")
    .update({
      last_checked_at: now.toISOString(),
      last_outcome: result.outcome,
      last_found: result.events.length,
      last_published: published,
      last_queued: queued,
      last_posters: result.documents.length,
    })
    .eq("mandir_id", mandir.id);

  return {
    outcome: result.outcome,
    found: result.events.length,
    published,
    queued,
    posters: result.documents.length,
    postersRead: 0,
    postersAdded: 0,
    postersLeft: connection.read_posters ? unread : [],
  };
}

// The website's own listed events not already on the page, published as
// the mandir's, confirmed (the committee asked for them to go live).
// Anything that doesn't pass the event checks is left to be queued.
async function publishFound(
  db: Db,
  mandirId: string,
  events: FoundEvent[],
  now: Date,
): Promise<number> {
  const known = (await knownFor(db, [mandirId])).get(mandirId) ?? [];
  let published = 0;
  for (const found of newEvents(events, known)) {
    const checked = checkEvent(
      {
        title: found.title,
        date: found.date,
        time: found.time,
        summary: found.summary,
        repeat: "none",
        until: "",
        kind: found.kind,
      },
      now,
    );
    if (!checked.ok) continue;
    const saved = await saveEvent(db, mandirId, checked.event, {
      confirmed: true,
      link: found.link && found.link.length <= 300 ? found.link : null,
      origin: "website",
    });
    if (saved.ok) published += 1;
  }
  return published;
}

// The posters and patrikas not read before.
async function unreadPosters(
  db: Db,
  mandirId: string,
  documents: FoundDocumentRef[],
): Promise<FoundDocumentRef[]> {
  if (!documents.length) return [];
  const { data } = await db
    .from("website_reads")
    .select("url")
    .eq("mandir_id", mandirId)
    .in(
      "url",
      documents.map((d) => d.url),
    );
  const read = new Set((data ?? []).map((r) => r.url));
  return documents.filter((d) => !read.has(d.url) && d.url.length <= 1000);
}

// Reads up to a few of the website's posters and patrikas with AI. What
// they show waits under "Posters waiting for you"; each is read once.
export async function readWebsitePosters(
  db: Db,
  mandir: ConnectedMandir,
  posters: FoundDocumentRef[],
  {
    max = POSTERS_PER_SITE,
    timeLeft = () => true,
    fetchDoc = fetchDocument,
    read = readPoster,
    now = new Date(),
  }: {
    max?: number;
    timeLeft?: () => boolean;
    fetchDoc?: typeof fetchDocument;
    read?: typeof readPoster;
    now?: Date;
  } = {},
): Promise<{ read: number; added: number }> {
  if (!posterReadingOn()) return { read: 0, added: 0 };
  let done = 0;
  let added = 0;
  for (const poster of posters) {
    if (done >= max || !timeLeft()) break;
    const file = await fetchDoc(poster.url, MAX_POSTER_BYTES);
    if (!file.ok || !isPosterType(file.type)) continue;
    done += 1;
    const result = await read(
      { data: file.data, type: file.type },
      { mandir: `${mandir.name}, ${mandir.town}`, today: londonDate(now) },
    );
    // A failed read is tried again next time; one that worked, or that
    // was declined, isn't.
    if (!result.ok && result.error === "failed") continue;
    let events = 0;
    if (result.ok) {
      const queued = await queueRead(
        db,
        mandir.id,
        "website",
        result.events,
        poster.url.length <= 300 ? poster.url : "",
      );
      events = queued.added;
      added += queued.added;
    }
    await db
      .from("website_reads")
      .upsert({ mandir_id: mandir.id, url: poster.url, events });
  }
  return { read: done, added };
}

// The nightly run over every connected website (/api/cron/websites),
// longest ago first, within the time it has. A few posters in all, so the
// AI bill stays small.
export const SITES_PER_RUN = 40;
export const POSTERS_PER_RUN = 20;

export async function runWebsiteSync(
  db: Db,
  {
    budgetMs = 240_000,
    check = checkWebsite,
    fetchDoc = fetchDocument,
    read = readPoster,
    now = new Date(),
  }: {
    budgetMs?: number;
    check?: typeof checkWebsite;
    fetchDoc?: typeof fetchDocument;
    read?: typeof readPoster;
    now?: Date;
  } = {},
) {
  const started = Date.now();
  const timeLeft = () => Date.now() - started < budgetMs;
  await db
    .from("website_reads")
    .delete()
    .lt("read_at", new Date(now.getTime() - 366 * 86_400_000).toISOString());
  const { data } = await db.rpc("website_connections_due", {
    max_sites: SITES_PER_RUN,
  });
  const due = (data ?? []) as (Connection & {
    slug: string;
    name: string;
    town: string;
  })[];
  const tally = {
    sites: 0,
    published: 0,
    queued: 0,
    postersRead: 0,
    postersAdded: 0,
    failed: 0,
  };
  for (const site of due) {
    if (!timeLeft()) break;
    const mandir = {
      id: site.mandir_id,
      slug: site.slug,
      name: site.name,
      town: site.town,
    };
    try {
      const summary = await syncWebsite(db, mandir, site, { check, now });
      tally.sites += 1;
      tally.published += summary.published;
      tally.queued += summary.queued;
      const left = POSTERS_PER_RUN - tally.postersRead;
      if (left > 0 && summary.postersLeft.length) {
        const posters = await readWebsitePosters(
          db,
          mandir,
          summary.postersLeft,
          {
            max: Math.min(POSTERS_PER_SITE, left),
            timeLeft,
            fetchDoc,
            read,
            now,
          },
        );
        tally.postersRead += posters.read;
        tally.postersAdded += posters.added;
      }
    } catch (error) {
      console.error("Reading a connected website failed", error);
      tally.failed += 1;
    }
  }
  await db.from("job_runs").insert({ job: "websites", summary: tally });
  return tally;
}
