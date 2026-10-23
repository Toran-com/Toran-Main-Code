"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  comparableEvent,
  draftParam,
  keepApart,
  listedEvents,
  matchesFor,
} from "@/lib/duplicate-check";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { saveEvent } from "@/lib/event-store";
import { lookupPostcode } from "@/lib/geo";
import { londonDate } from "@/lib/london";
import { parsePracticalDetails } from "@/lib/mandir-form";
import { likenessFrom, reviewPoster } from "@/lib/poster-review";
import { picksFromForm } from "@/lib/quick-events";
import { createSessionClient } from "@/lib/supabase/session";

// Changes a mandir admin makes to their mandir's events. The database's
// row-level security decides who may change what; these actions check the
// form and refresh the public pages afterwards.

export async function addEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  const input = eventInputFrom(formData);
  const checked = checkEvent(input);
  if (!checked.ok) back(`error=${checked.error}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  // Never listed twice. Already on the page: change that one instead. Maybe
  // on the page: the form comes back, as typed, to ask.
  const draft = `draft=${draftParam(input)}#add-event`;
  const listed =
    (
      await listedEvents(
        supabase,
        [mandir.id],
        londonDate(checked.event.startsAt),
      )
    ).get(mandir.id) ?? [];
  const matches = matchesFor(comparableEvent(checked.event), listed);
  const sure = matches.find((m) => m.verdict === "same");
  if (sure) back(`error=duplicate&dup=${sure.id}&${draft}`);
  const different = String(formData.get("different") ?? "").split(",");
  if (matches.some((m) => !different.includes(m.id))) {
    back(`maybe=${matches.map((m) => m.id).join(",")}&${draft}`);
  }

  // Adding it is confirming it.
  const saved = await saveEvent(supabase, mandir.id, checked.event, {
    confirmed: true,
    origin: "mandir",
  });
  if (!saved.ok) {
    back(
      saved.duplicate
        ? `error=duplicate&dup=${saved.duplicate}&${draft}`
        : "error=failed",
    );
  }
  // They said it's different from these: don't ask again.
  await keepApart(
    supabase,
    saved.id,
    matches.map((m) => m.id),
  );
  updateTag(`mandir:${mandir.slug}`);
  updateTag("events");
  back("added=1");
}

// Several events at once: the festivals or last year's events the
// committee ticked. Every one is checked before any is saved, so a mistake
// in one row doesn't leave half of them added.
export async function addPickedEvents(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  const picks = picksFromForm(formData);
  if (!picks.length) back("error=none");
  const checked = picks.map((pick) => ({
    result: checkEvent(pick.input),
    festivalDateId: pick.festivalDateId,
  }));
  for (const { result } of checked) {
    if (!result.ok) back(`error=${result.error}`);
  }

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  // Anything that is, or may be, on the page already is left out (and
  // said so); it can be added on its own if it's different.
  const listed =
    (await listedEvents(supabase, [mandir.id])).get(mandir.id) ?? [];
  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const { result, festivalDateId } of checked) {
    if (!result.ok) continue;
    const item = comparableEvent(result.event);
    if (matchesFor(item, listed).length) {
      skipped += 1;
      continue;
    }
    const saved = await saveEvent(supabase, mandir.id, result.event, {
      confirmed: true,
      origin: "mandir",
      festivalDateId,
    });
    if (saved.ok) {
      added += 1;
      // Two picks for the same event count once.
      listed.push({
        kind: "event",
        id: saved.id,
        ...item,
        time: item.time ?? "",
        cancelled: false,
      });
    } else if (saved.duplicate) {
      skipped += 1;
    } else {
      failed += 1;
    }
  }
  if (added) {
    updateTag(`mandir:${mandir.slug}`);
    updateTag("events");
  }
  const counts = `added=${added}${skipped ? `&skipped=${skipped}` : ""}`;
  if (failed) back(`${counts}&error=failed`);
  back(counts);
}

const CHANGES = {
  confirm: { confirmed_at: "now" },
  cancel: { status: "cancelled" },
  restore: { status: "published" },
  remove: { status: "removed" },
} as const;

export async function changeEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const eventId = String(formData.get("event") ?? "");
  const intent = String(formData.get("intent") ?? "");
  const back = (query: string) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  if (!(intent in CHANGES)) back("error=failed");
  const change = CHANGES[intent as keyof typeof CHANGES];
  const update =
    "confirmed_at" in change
      ? { confirmed_at: new Date().toISOString() }
      : { status: change.status };

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase!
    .from("events")
    .update(update)
    .eq("id", eventId)
    .select("mandir:mandirs (slug)")
    .maybeSingle();
  if (error || !data) back("error=failed");
  if (data!.mandir) updateTag(`mandir:${data!.mandir.slug}`);
  updateTag("events");
  back(`done=${intent}`);
}

// A committee updates its mandir's practical details. Name, town, region
// and status stay with Toran admins (enforced by the database).
export async function updatePracticalDetails(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);
  const parsed = parsePracticalDetails(formData);
  if (!parsed.ok) back(`error=${parsed.error}`);
  const values = parsed.values;

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: before } = await supabase
    .from("mandirs")
    .select("postcode, latitude")
    .eq("slug", slug)
    .maybeSingle();
  if (!before) back("error=failed");

  let position = {};
  if (before.postcode !== values.postcode || before.latitude === null) {
    position = { latitude: null, longitude: null };
    if (values.postcode) {
      try {
        position = (await lookupPostcode(values.postcode)) ?? position;
      } catch {
        // Saved without a map position; Toran fills it in later.
      }
    }
  }

  const { data, error } = await supabase
    .from("mandirs")
    .update({ ...values, ...position })
    .eq("slug", slug)
    .select("slug");
  if (error || !data?.length) back("error=failed");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  back("done=details");
}

// The committee publishes a poster someone forwarded to Toran (which
// confirms it), or says it's not right.
export async function reviewPosterAsCommittee(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const claimId = String(formData.get("poster") ?? "");
  const choice = String(formData.get("decision") ?? "");
  const decision = choice === "discard" ? "discard" : "publish";
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  // "Fix something first": publish the committee's corrected details.
  const result = await reviewPoster(
    supabase,
    claimId,
    decision,
    "committee",
    choice === "edit-publish" ? eventInputFrom(formData) : undefined,
    likenessFrom(formData),
  );
  if (!result.ok) {
    // A correction that didn't pass the checks stays open to fix.
    const said = ["done", "failed", "maybe", "cancelled"].includes(result.error)
      ? result.error
      : "poster";
    back(`${choice === "edit-publish" ? `fix=${claimId}&` : ""}error=${said}`);
  }
  if (decision === "publish") {
    updateTag(`mandir:${result.slug}`);
    updateTag("events");
  }
  back(
    `done=${decision === "discard" ? "discarded" : result.merged ? "merged" : "published"}`,
  );
}

// The committee on Toran: invite a colleague by email, cancel an invite,
// take someone off or leave. The database functions decide who may.
const INVITE_ERRORS: Record<string, string> = {
  email: "invite-email",
  member: "invite-member",
  too_many: "invite-too-many",
};

export async function inviteMember(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const email = String(formData.get("email") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}#committee`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");
  const { error } = await supabase.rpc("invite_committee_member", {
    target: mandir.id,
    invitee: email,
  });
  if (error) back(`error=${INVITE_ERRORS[error.message] ?? "failed"}`);
  back("done=invited");
}

export async function cancelInvite(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}#committee`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data, error } = await supabase.rpc("drop_committee_invite", {
    invite: String(formData.get("invite") ?? ""),
  });
  if (error || !data) back("error=failed");
  back("done=uninvited");
}

export async function removeMember(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const member = String(formData.get("member") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}#committee`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const [{ data: mandir }, { data: auth }] = await Promise.all([
    supabase.from("mandirs").select("id").eq("slug", slug).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!mandir) back("error=failed");
  const { data, error } = await supabase.rpc("remove_committee_member", {
    target: mandir.id,
    member,
  });
  if (error || !data) back("error=failed");
  updateTag(`mandir:${slug}`);
  updateTag("mandirs");
  // Leaving: this page is no longer theirs.
  if (member === auth.user?.id) redirect("/account?done=left");
  back("done=removed");
}
