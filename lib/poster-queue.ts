import { checkEvent, type EventInput } from "@/lib/event-form";
import { alreadyKnown, comparableInput, knownFor } from "@/lib/duplicate-check";
import { POSTER_SOURCES, type PosterSource } from "@/lib/posters";
import type { createSessionClient } from "@/lib/supabase/session";

// Putting posters into the review queue (event_claims), for Toran
// (/ops/posters) and for committees reading their own posters
// (/manage/<mandir>). Row-level security decides who may add to which
// mandir's queue.

type Db = NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;

// One source per mandir and kind of message, reused.
export async function posterSource(
  supabase: Db,
  mandirId: string,
  from: PosterSource,
): Promise<string | null> {
  const source = POSTER_SOURCES[from];
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("mandir_id", mandirId)
    .eq("kind", source.kind)
    .eq("label", source.label)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase
    .from("sources")
    .insert({ mandir_id: mandirId, kind: source.kind, label: source.label })
    .select("id")
    .single();
  return created?.id ?? null;
}

// Events read off a poster go to the review queue, marked as read by
// machine, apart from ones already listed, waiting or discarded (and the
// same event twice on one poster).
export async function queueRead(
  supabase: Db,
  mandirId: string,
  from: PosterSource,
  events: EventInput[],
  link: string,
): Promise<{ added: number; skipped: number }> {
  const known = (await knownFor(supabase, [mandirId])).get(mandirId) ?? [];
  const sourceId = await posterSource(supabase, mandirId, from);
  let added = 0;
  let skipped = 0;
  for (const input of events) {
    const item = comparableInput(input);
    if (!checkEvent(input).ok || alreadyKnown(item, known)) {
      skipped += 1;
      continue;
    }
    const { error } = await supabase.from("event_claims").insert({
      mandir_id: mandirId,
      source_id: sourceId,
      proposed: { ...input, from, link, read: "machine" },
      // Lower than a typed-up poster: nobody has looked at it yet.
      confidence: 0.4,
    });
    if (error) {
      skipped += 1;
      continue;
    }
    added += 1;
    // The same event twice on one poster is queued once.
    known.push({
      ...item,
      time: input.time,
      kind: "queue",
      id: "",
      discarded: false,
    });
  }
  return { added, skipped };
}
