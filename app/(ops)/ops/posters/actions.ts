"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { correctPoster, reviewPoster } from "@/lib/poster-review";
import { checkLink, POSTER_SOURCES, type PosterSource } from "@/lib/posters";
import { createSessionClient } from "@/lib/supabase/session";
import { eventKey, knownEvents } from "@/lib/website-claims";
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

  const publish = decision === "publish" || decision === "edit-publish";
  const result = await reviewPoster(
    supabase,
    claimId,
    publish ? "publish" : "discard",
    "toran",
    decision === "edit-publish" ? eventInputFrom(formData) : undefined,
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
  back(`done=${publish ? "published" : "discarded"}`);
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
    const known = new Set(
      (await knownEvents(supabase, mandirId)).map((k) =>
        eventKey(k.title, k.date),
      ),
    );
    const fresh = mine.filter(
      (r) => !known.has(eventKey(r.input.title, r.input.date)),
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
