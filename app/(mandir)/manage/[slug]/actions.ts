"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  comparableEvent,
  draftParam,
  keepApart,
  listedEvents,
  matchesFor,
} from "@/lib/duplicate-check";
import { feedAddress } from "@/lib/calendar-feed";
import { checkEvent, eventInputFrom } from "@/lib/event-form";
import { saveEvent } from "@/lib/event-store";
import { lookupPostcode } from "@/lib/geo";
import { londonDate } from "@/lib/london";
import { parsePracticalDetails } from "@/lib/mandir-form";
import { queueRead } from "@/lib/poster-queue";
import {
  isPosterType,
  MAX_POSTER_BYTES,
  posterReadingOn,
  readPoster,
} from "@/lib/poster-reader";
import { likenessFrom, reviewPoster } from "@/lib/poster-review";
import { senderAddress, sendLimiter } from "@/lib/spam";
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

// The mandir's own events calendar, read every night for new events
// (lib/nightly.ts). A new address starts afresh: it's read tonight.
export async function saveCalendar(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}#calendar`);
  const address = feedAddress(String(formData.get("calendar_url") ?? ""));
  if (!address.ok) back(`error=calendar-${address.error}`);

  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");
  const { error } = await supabase.from("mandir_calendars").upsert({
    mandir_id: mandir.id,
    url: address.url,
    added_at: new Date().toISOString(),
    last_read_at: null,
    last_outcome: null,
    last_found: null,
    last_added: null,
  });
  if (error) back("error=failed");
  back("done=calendar");
}

export async function removeCalendar(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}#calendar`);
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed");
  const { error } = await supabase
    .from("mandir_calendars")
    .delete()
    .eq("mandir_id", mandir.id);
  if (error) back("error=failed");
  back("done=calendar-removed");
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

// The committee sends a photo or PDF of its own poster; Claude reads the
// events off it and they wait under "Posters waiting for you", to check
// and publish like any other. Only someone on the committee (or a Toran
// admin) can, and only a few at a time, since each one costs a little.
export async function readPosterAsCommittee(formData: FormData) {
  const slug = String(formData.get("mandir") ?? "");
  const file = formData.get("poster");
  const back: (query: string) => never = (query) =>
    redirect(`/manage/${encodeURIComponent(slug)}?${query}`);

  if (!posterReadingOn()) back("error=readingOff#read-poster");
  if (!(file instanceof File) || file.size === 0) {
    back("error=picture#read-poster");
  }
  if (!isPosterType(file.type)) back("error=pictureType#read-poster");
  if (file.size > MAX_POSTER_BYTES) back("error=pictureSize#read-poster");

  const user = await getCurrentUser();
  const supabase = await createSessionClient();
  if (!user || !supabase) back("error=failed#read-poster");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, name, town")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir) back("error=failed#read-poster");
  const { data: admin } = await supabase
    .from("mandir_admins")
    .select("mandir_id")
    .eq("mandir_id", mandir.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin && !(user.isToranAdmin && user.aal === "aal2")) {
    back("error=failed#read-poster");
  }
  if (
    !sendLimiter.allow(`poster:${mandir.id}`, senderAddress(await headers()))
  ) {
    back("error=slow#read-poster");
  }

  const read = await readPoster(
    { data: Buffer.from(await file.arrayBuffer()), type: file.type },
    {
      mandir: `${mandir.name}, ${mandir.town}`,
      today: londonDate(new Date()),
    },
  );
  if (!read.ok) {
    back(
      `error=${read.error === "refused" ? "pictureRefused" : "pictureFailed"}#read-poster`,
    );
  }
  const { added, skipped } = await queueRead(
    supabase,
    mandir.id,
    "printed",
    read.events,
    "",
  );
  back(`read=${added}&skipped=${skipped}#posters`);
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
