"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { saveEvent } from "@/lib/event-store";
import { lookupPostcode } from "@/lib/geo";
import { parsePracticalDetails } from "@/lib/mandir-form";
import { reviewPoster } from "@/lib/poster-review";
import { picksFromForm } from "@/lib/quick-events";
import { createSessionClient } from "@/lib/supabase/session";

// Changes a mandir admin makes to their mandir's events. The database's
// row-level security decides who may change what; these actions check the
// form and refresh the public pages afterwards.

export async function addEvent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  const checked = checkEvent(eventInputFrom(formData));
  if (!checked.ok) back(`error=${checked.error}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");

  // Adding it is confirming it.
  const id = await saveEvent(supabase, mandir.id, checked.event, {
    confirmed: true,
    origin: "mandir",
  });
  if (!id) back("error=failed");
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

  let added = 0;
  for (const { result, festivalDateId } of checked) {
    if (!result.ok) continue;
    const id = await saveEvent(supabase, mandir.id, result.event, {
      confirmed: true,
      origin: "mandir",
      festivalDateId,
    });
    if (id) added += 1;
  }
  if (added) {
    updateTag(`mandir:${mandir.slug}`);
    updateTag("events");
  }
  if (added < checked.length) back(`added=${added}&error=failed`);
  back(`added=${added}`);
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
  const decision =
    choice === "publish" || choice === "edit-publish" ? "publish" : "discard";
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
  );
  if (!result.ok) {
    // A correction that didn't pass the checks stays open to fix.
    back(
      `${choice === "edit-publish" ? `fix=${claimId}&` : ""}error=${result.error === "done" || result.error === "failed" ? result.error : "poster"}`,
    );
  }
  if (decision === "publish") {
    updateTag(`mandir:${result.slug}`);
    updateTag("events");
  }
  back(`done=${decision === "publish" ? "published" : "discarded"}`);
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
