import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  alreadyKnown,
  knownFor,
  type Listed,
  type Waiting,
} from "@/lib/duplicate-check";
import { compareEvents } from "@/lib/duplicates";
import type { CheckResult } from "@/lib/website-check";
import type { FoundEvent } from "@/lib/website-events";

// Puts what a website check found into the review queue, as posters "from
// the mandir's website", so they reach the committee (or Toran) exactly
// like a forwarded poster. Skips anything already listed or queued, and
// records how the check went on the mandir's website source.

const SOURCE = { kind: "crawler", label: "Website check" } as const;

// At most this many new events from one check, so a busy calendar feed
// can't flood the queue.
const MAX_NEW = 20;

// The found events not already known for this mandir (lib/duplicate-check.ts).
export function newEvents(
  found: FoundEvent[],
  known: readonly (Listed | Waiting)[],
): FoundEvent[] {
  const kept: FoundEvent[] = [];
  return found
    .filter((e) => {
      if (alreadyKnown(e, known)) return false;
      // A site listing the same event twice.
      if (kept.some((k) => compareEvents(k, e) === "same")) return false;
      kept.push(e);
      return true;
    })
    .slice(0, MAX_NEW);
}

export async function recordWebsiteCheck(
  db: SupabaseClient<Database>,
  mandir: { id: string; website: string },
  result: CheckResult,
): Promise<{ added: number } | null> {
  const { data: existing } = await db
    .from("sources")
    .select("id")
    .eq("mandir_id", mandir.id)
    .eq("kind", SOURCE.kind)
    .limit(1)
    .maybeSingle();
  let sourceId = existing?.id ?? null;
  if (!sourceId) {
    const { data: created } = await db
      .from("sources")
      .insert({ mandir_id: mandir.id, ...SOURCE, url: mandir.website })
      .select("id")
      .single();
    sourceId = created?.id ?? null;
  }
  if (!sourceId) return null;

  let added = 0;
  if (result.events.length) {
    const known = (await knownFor(db, [mandir.id])).get(mandir.id) ?? [];
    const fresh = newEvents(result.events, known);
    if (fresh.length) {
      const { error } = await db.from("event_claims").insert(
        fresh.map((e) => ({
          mandir_id: mandir.id,
          source_id: sourceId,
          proposed: {
            title: e.title,
            date: e.date,
            time: e.time,
            summary: e.summary,
            kind: e.kind,
            repeat: "none",
            until: "",
            from: "website",
            link: e.link.length <= 300 ? e.link : mandir.website,
          },
          // Read from the mandir's own structured data: likely right, but
          // still checked by a person before it's published.
          confidence: 0.8,
        })),
      );
      if (error) return null;
      added = fresh.length;
    }
  }

  await db
    .from("sources")
    .update({
      url: mandir.website,
      last_checked_at: new Date().toISOString(),
      last_outcome: result.outcome,
      last_found: result.events.length,
      last_notes: result.notes.join("\n").slice(0, 1000) || null,
    })
    .eq("id", sourceId);
  return { added };
}

// The mandir websites checked longest ago, never-checked first.
export async function websiteQueue(
  db: SupabaseClient<Database>,
  limit: number,
): Promise<{ id: string; website: string }[]> {
  const [{ data: mandirs }, { data: sources }] = await Promise.all([
    db
      .from("mandirs")
      .select("id, website")
      .not("website", "is", null)
      .neq("status", "hidden"),
    db
      .from("sources")
      .select("mandir_id, last_checked_at")
      .eq("kind", SOURCE.kind),
  ]);
  const lastChecked = new Map(
    (sources ?? []).map((s) => [s.mandir_id, s.last_checked_at ?? ""]),
  );
  return (mandirs ?? [])
    .flatMap((m) => (m.website ? [{ id: m.id, website: m.website }] : []))
    .sort((a, b) =>
      (lastChecked.get(a.id) ?? "").localeCompare(lastChecked.get(b.id) ?? ""),
    )
    .slice(0, limit);
}
