import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { checkEvent, type EventError } from "@/lib/event-form";
import { originOfPoster } from "@/lib/event-kinds";
import { saveEvent } from "@/lib/event-store";
import { posterFrom } from "@/lib/posters";

export type ReviewResult =
  | { ok: true; slug: string }
  | { ok: false; error: EventError | "done" | "claimed" | "failed" };

// Publishes a forwarded poster as an event, or discards it. Used by a
// mandir's committee (which confirms it by publishing) and by Toran for
// mandirs nobody looks after yet. Row-level security decides who may.
export async function reviewPoster(
  db: SupabaseClient<Database>,
  claimId: string,
  decision: "publish" | "discard",
  as: "committee" | "toran",
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
    return data?.length ? { ok: true, slug } : { ok: false, error: "done" };
  }

  // A mandir with a committee confirms its own events.
  if (as === "toran" && claim.mandir.status === "claimed") {
    return { ok: false, error: "claimed" };
  }
  const poster = posterFrom(claim.proposed);
  if (!poster) return { ok: false, error: "failed" };
  const checked = checkEvent(poster);
  if (!checked.ok) return checked;

  const eventId = await saveEvent(db, claim.mandir.id, checked.event, {
    confirmed: as === "committee",
    link: poster.link || null,
    origin: originOfPoster(poster.from),
  });
  if (!eventId) return { ok: false, error: "failed" };
  const { data } = await db
    .from("event_claims")
    .update({ status: "accepted", event_id: eventId })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id");
  if (!data?.length) {
    // Someone else dealt with it at the same moment: keep theirs.
    await db.from("events").update({ status: "removed" }).eq("id", eventId);
    return { ok: false, error: "done" };
  }
  return { ok: true, slug };
}
