import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  comparableEvent,
  fillGaps,
  keepApart,
  listedEvents,
  matchesFor,
} from "@/lib/duplicate-check";
import { checkEvent, type EventError, type EventInput } from "@/lib/event-form";
import { originOfPoster } from "@/lib/event-kinds";
import { saveEvent } from "@/lib/event-store";
import { londonDate } from "@/lib/london";
import { type Poster, posterFrom } from "@/lib/posters";

export type ReviewResult =
  | { ok: true; slug: string; merged: boolean }
  | {
      ok: false;
      error:
        | EventError
        | "done"
        | "claimed"
        | "failed"
        // It may be an event already listed: the reviewer says which.
        | "maybe"
        // It's an event the mandir has cancelled.
        | "cancelled";
    };

// What the reviewer said about look-alikes already listed: it's the same
// as one of them (add anything new to it), or a different event.
export type Likeness = { same: string } | { different: true };

// The reviewer's answer, from the review form's buttons.
export function likenessFrom(formData: FormData): Likeness | undefined {
  const decision = String(formData.get("decision") ?? "");
  if (decision === "different") return { different: true };
  const same = String(formData.get("same") ?? "");
  return decision === "same" && /^[0-9a-f-]{36}$/.test(same)
    ? { same }
    : undefined;
}

// Publishes a forwarded poster as an event, or discards it. Used by a
// mandir's committee (which confirms it by publishing) and by Toran for
// mandirs nobody looks after yet. Row-level security decides who may.
// `edited` publishes the reviewer's corrected details instead, and keeps
// them with the poster. An event already listed is never listed twice: a
// sure copy adds anything new to the one listed, and a possible copy
// waits for the reviewer to say (`likeness`).
export async function reviewPoster(
  db: SupabaseClient<Database>,
  claimId: string,
  decision: "publish" | "discard",
  as: "committee" | "toran",
  edited?: EventInput,
  likeness?: Likeness,
): Promise<ReviewResult> {
  const { data: claim } = await db
    .from("event_claims")
    .select("id, status, proposed, mandir:mandirs (id, slug, status)")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim?.mandir) return { ok: false, error: "failed" };
  if (claim.status !== "pending") return { ok: false, error: "done" };
  const { slug } = claim.mandir;

  if (decision === "discard") {
    const { data } = await db
      .from("event_claims")
      .update({ status: "rejected" })
      .eq("id", claimId)
      .eq("status", "pending")
      .select("id");
    return data?.length
      ? { ok: true, slug, merged: false }
      : { ok: false, error: "done" };
  }

  // A mandir with a committee confirms its own events.
  if (as === "toran" && claim.mandir.status === "claimed") {
    return { ok: false, error: "claimed" };
  }
  const original = posterFrom(claim.proposed);
  if (!original) return { ok: false, error: "failed" };
  const poster: Poster = edited ? { ...original, ...edited } : original;
  const checked = checkEvent(poster);
  if (!checked.ok) return checked;

  const listed =
    (
      await listedEvents(
        db,
        [claim.mandir.id],
        londonDate(checked.event.startsAt),
      )
    ).get(claim.mandir.id) ?? [];
  const matches = matchesFor(comparableEvent(checked.event), listed);
  const sure = matches.find((m) => m.verdict === "same");
  const chosen =
    likeness && "same" in likeness
      ? matches.find((m) => m.id === likeness.same)
      : undefined;
  if (likeness && "same" in likeness && !chosen) {
    return { ok: false, error: "failed" };
  }
  const into = chosen ?? sure;
  if (into) {
    if (into.cancelled) return { ok: false, error: "cancelled" };
    return mergeClaim(
      db,
      claimId,
      slug,
      into.id,
      checked.event,
      poster,
      edited,
    );
  }
  if (matches.length && !(likeness && "different" in likeness)) {
    return { ok: false, error: "maybe" };
  }

  const saved = await saveEvent(db, claim.mandir.id, checked.event, {
    confirmed: as === "committee",
    link: poster.link || null,
    origin: originOfPoster(poster.from),
  });
  if (!saved.ok) {
    return saved.duplicate
      ? mergeClaim(
          db,
          claimId,
          slug,
          saved.duplicate,
          checked.event,
          poster,
          edited,
        )
      : { ok: false, error: "failed" };
  }
  const eventId = saved.id;
  // The reviewer said it's different from these: don't ask again.
  await keepApart(
    db,
    eventId,
    matches.map((m) => m.id),
  );
  const { data } = await db
    .from("event_claims")
    .update({
      status: "accepted",
      event_id: eventId,
      ...(edited && { proposed: poster }),
    })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id");
  if (!data?.length) {
    // Someone else dealt with it at the same moment: keep theirs.
    await db.from("events").update({ status: "removed" }).eq("id", eventId);
    return { ok: false, error: "done" };
  }
  return { ok: true, slug, merged: false };
}

// The poster is about an event already listed: anything new it says is
// added to that event, and the poster is marked as dealt with, pointing at
// it.
async function mergeClaim(
  db: SupabaseClient<Database>,
  claimId: string,
  slug: string,
  eventId: string,
  event: Parameters<typeof fillGaps>[2],
  poster: Poster,
  edited?: EventInput,
): Promise<ReviewResult> {
  if (!(await fillGaps(db, eventId, event, poster.link || null))) {
    return { ok: false, error: "failed" };
  }
  const { data } = await db
    .from("event_claims")
    .update({
      status: "accepted",
      event_id: eventId,
      ...(edited && { proposed: poster }),
    })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id");
  return data?.length
    ? { ok: true, slug, merged: true }
    : { ok: false, error: "done" };
}

// Corrects a poster's details while it waits, without publishing: Toran
// fixing a typo for a mandir whose committee publishes its own events.
export async function correctPoster(
  db: SupabaseClient<Database>,
  claimId: string,
  edited: EventInput,
): Promise<ReviewResult> {
  const { data: claim } = await db
    .from("event_claims")
    .select("status, proposed, mandir:mandirs (slug)")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim?.mandir) return { ok: false, error: "failed" };
  if (claim.status !== "pending") return { ok: false, error: "done" };
  const original = posterFrom(claim.proposed);
  if (!original) return { ok: false, error: "failed" };
  const checked = checkEvent(edited);
  if (!checked.ok) return checked;
  const { data } = await db
    .from("event_claims")
    .update({ proposed: { ...original, ...edited } })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id");
  return data?.length
    ? { ok: true, slug: claim.mandir.slug, merged: false }
    : { ok: false, error: "done" };
}
