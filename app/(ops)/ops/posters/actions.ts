"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { correctPoster, reviewPoster } from "@/lib/poster-review";
import { checkLink, POSTER_SOURCES, type PosterSource } from "@/lib/posters";
import { createSessionClient } from "@/lib/supabase/session";

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

  // One source per mandir and kind of message, reused.
  const source = POSTER_SOURCES[from as PosterSource];
  const { data: existing } = await supabase
    .from("sources")
    .select("id")
    .eq("mandir_id", mandir.id)
    .eq("kind", source.kind)
    .eq("label", source.label)
    .limit(1)
    .maybeSingle();
  let sourceId = existing?.id ?? null;
  if (!sourceId) {
    const { data: created } = await supabase
      .from("sources")
      .insert({ mandir_id: mandir.id, kind: source.kind, label: source.label })
      .select("id")
      .single();
    sourceId = created?.id ?? null;
  }

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
