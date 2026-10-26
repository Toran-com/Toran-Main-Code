"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { checkEvent, eventInputFrom, type EventInput } from "@/lib/event-form";
import { correctPoster, likenessFrom, reviewPoster } from "@/lib/poster-review";
import { checkLink, POSTER_SOURCES, type PosterSource } from "@/lib/posters";
import { createSessionClient } from "@/lib/supabase/session";
import { alreadyKnown, comparableInput, knownFor } from "@/lib/duplicate-check";
import { londonDate } from "@/lib/london";
import {
  isPosterType,
  MAX_POSTER_BYTES,
  posterReadingOn,
  readPoster,
} from "@/lib/poster-reader";
import { fetchDocument } from "@/lib/website-check";
import { parseWebsiteEvents } from "@/lib/website-import";

// One source per mandir and kind of message, reused.
async function posterSource(
  supabase: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>,
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

// Toran types up a poster or message forwarded about a mandir's event. It
// waits in the queue for the mandir's committee to publish, or for Toran
// to publish if nobody looks after the mandir yet.
export async function addPoster(formData: FormData) {
  await requireToranAdmin("/ops/posters");
  const slug = String(formData.get("mandir") ?? "");
  const from = String(formData.get("from") ?? "");
  const link = String(formData.get("link") ?? "").trim();
  const back: (query: string) => never = (query) =>
    redirect(`/ops/posters?mandir=${encodeURIComponent(slug)}&${query}`);

  if (!(from in POSTER_SOURCES) || from === "visitor") back("error=from");
  if (!checkLink(link)) back("error=link");
  const input = eventInputFrom(formData);
  const checked = checkEvent(input);
  if (!checked.ok) back(`error=${checked.error}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=mandir");
  // Already listed, waiting or discarded: not queued twice.
  const known = await knownFor(supabase, [mandir.id]);
  if (alreadyKnown(comparableInput(input), known.get(mandir.id))) {
    back("error=already");
  }

  const sourceId = await posterSource(
    supabase,
    mandir.id,
    from as PosterSource,
  );
  const { error } = await supabase.from("event_claims").insert({
    mandir_id: mandir.id,
    source_id: sourceId,
    proposed: { ...input, from, link },
    confidence: 0.6,
  });
  if (error) back("error=failed");
  redirect("/ops/posters?added=1");
}

export async function reviewPosterAsToran(formData: FormData) {
  await requireToranAdmin("/ops/posters");
  const claimId = String(formData.get("poster") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const group = String(formData.get("group") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(
      `/ops/posters?${group ? `from=${encodeURIComponent(group)}&` : ""}${query}`,
    );
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");

  // Corrected details, kept for the committee to publish.
  if (decision === "edit") {
    const result = await correctPoster(
      supabase,
      claimId,
      eventInputFrom(formData),
    );
    if (!result.ok) back(`fix=${claimId}&error=${result.error}`);
    back("done=corrected");
  }

  const publish = decision !== "discard";
  const result = await reviewPoster(
    supabase,
    claimId,
    publish ? "publish" : "discard",
    "toran",
    decision === "edit-publish" ? eventInputFrom(formData) : undefined,
    likenessFrom(formData),
  );
  if (!result.ok) {
    // A correction that didn't pass the checks stays open to fix.
    back(
      `${decision === "edit-publish" ? `fix=${claimId}&` : ""}error=${result.error}`,
    );
  }
  if (publish) {
    updateTag(`mandir:${result.slug}`);
    updateTag("events");
  }
  back(
    `done=${!publish ? "discarded" : result.merged ? "merged" : "published"}`,
  );
}

// Several events read from mandirs' own websites, pasted as spreadsheet
// rows (lib/website-import.ts). Each joins the queue "From the mandir's
// website"; anything the mandir already has, or that's already waiting,
// is skipped, so the same paste can safely be sent again.
export async function importWebsiteEvents(formData: FormData) {
  await requireToranAdmin("/ops/posters");
  const { rows, problems } = parseWebsiteEvents(
    String(formData.get("rows") ?? ""),
  );
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops/posters?error=failed#import");

  const slugs = [...new Set(rows.map((r) => r.slug))];
  const { data: mandirs } = slugs.length
    ? await supabase.from("mandirs").select("id, slug").in("slug", slugs)
    : { data: [] };
  const ids = new Map((mandirs ?? []).map((m) => [m.slug, m.id]));

  const known = await knownFor(supabase, [...ids.values()]);
  let added = 0;
  let skipped = 0;
  for (const slug of slugs) {
    const mandirId = ids.get(slug);
    const mine = rows.filter((r) => r.slug === slug);
    if (!mandirId) {
      problems.push(
        ...mine.map((r) => ({ line: r.line, problem: "mandir" as const })),
      );
      continue;
    }
    // Anything already listed, waiting or discarded is left out; a
    // possible copy joins the queue, flagged for the reviewer.
    const fresh = mine.filter(
      (r) => !alreadyKnown(comparableInput(r.input), known.get(mandirId)),
    );
    skipped += mine.length - fresh.length;
    if (!fresh.length) continue;
    const sourceId = await posterSource(supabase, mandirId, "website");
    const { error } = await supabase.from("event_claims").insert(
      fresh.map((r) => ({
        mandir_id: mandirId,
        source_id: sourceId,
        proposed: { ...r.input, from: "website", link: r.link },
        // Read by a person from the mandir's own page: likely right, but
        // still checked before it's published.
        confidence: 0.7,
      })),
    );
    if (error) {
      problems.push(
        ...fresh.map((r) => ({ line: r.line, problem: "failed" as const })),
      );
    } else {
      added += fresh.length;
    }
  }

  const report = problems
    .sort((a, b) => a.line - b.line)
    .slice(0, 30)
    .map((p) => `${p.line}:${p.problem}`)
    .join(",");
  redirect(
    `/ops/posters?imported=${added}&skipped=${skipped}${report ? `&problems=${encodeURIComponent(report)}` : ""}#import`,
  );
}

// Toran sends a photo or PDF of a poster; Claude reads the events off it
// (lib/poster-reader.ts) and each one joins the queue to be checked, like
// one typed up by hand. Events already listed or waiting are left out.
export async function readPosterPicture(formData: FormData) {
  await requireToranAdmin("/ops/posters");
  const slug = String(formData.get("mandir") ?? "");
  const from = String(formData.get("from") ?? "");
  const file = formData.get("poster");
  const back: (query: string) => never = (query) =>
    redirect(`/ops/posters?mandir=${encodeURIComponent(slug)}&${query}#read`);

  if (!posterReadingOn()) back("error=readingOff");
  if (!(from in POSTER_SOURCES) || from === "visitor") back("error=from");
  if (!(file instanceof File) || file.size === 0) back("error=picture");
  if (!isPosterType(file.type)) back("error=pictureType");
  if (file.size > MAX_POSTER_BYTES) back("error=pictureSize");

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, name, town")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=mandir");

  const read = await readPoster(
    { data: Buffer.from(await file.arrayBuffer()), type: file.type },
    {
      mandir: `${mandir.name}, ${mandir.town}`,
      today: londonDate(new Date()),
    },
  );
  if (!read.ok)
    back(
      `error=${read.error === "refused" ? "pictureRefused" : "pictureFailed"}`,
    );

  const { added, skipped } = await queueRead(
    supabase,
    mandir.id,
    from as PosterSource,
    read.events,
    "",
  );
  redirect(`/ops/posters?read=${added}&skipped=${skipped}`);
}

// Events read off a poster go to the review queue, marked as read by
// machine, apart from ones already listed, waiting or discarded (and the
// same event twice on one poster).
async function queueRead(
  supabase: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>,
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

// A patrika or poster the website check found on a mandir's site
// (/ops/websites): fetched as carefully as the site's pages, and read
// like one sent in. Only what a check found for that mandir can be read,
// so this can't be used to fetch anything else.
export async function readFoundPatrika(formData: FormData) {
  await requireToranAdmin("/ops/websites");
  const slug = String(formData.get("mandir") ?? "");
  const url = String(formData.get("url") ?? "");
  const back: (error: string) => never = (error) =>
    redirect(`/ops/websites?error=${error}`);

  if (!posterReadingOn()) back("readingOff");
  const supabase = await createSessionClient();
  if (!supabase) back("failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, name, town")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("failed");
  const { data: checks } = await supabase
    .from("sources")
    .select("last_documents")
    .eq("mandir_id", mandir.id)
    .eq("kind", "crawler");
  const found = (checks ?? [])
    .flatMap((c) => (Array.isArray(c.last_documents) ? c.last_documents : []))
    .some((d) => !!d && typeof d === "object" && "url" in d && d.url === url);
  if (!found) back("notFound");

  const file = await fetchDocument(url, MAX_POSTER_BYTES);
  if (!file.ok) back(file.error);
  if (!isPosterType(file.type)) back("documentType");

  const read = await readPoster(
    { data: file.data, type: file.type },
    {
      mandir: `${mandir.name}, ${mandir.town}`,
      today: londonDate(new Date()),
    },
  );
  if (!read.ok) back(read.error === "refused" ? "refused" : "readFailed");

  const { added, skipped } = await queueRead(
    supabase,
    mandir.id,
    "website",
    read.events,
    url.length <= 300 ? url : "",
  );
  redirect(`/ops/posters?read=${added}&skipped=${skipped}`);
}
