import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Badge } from "@/components/public-shell";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
  pillButtonClass,
  pillPrimaryClass,
  quietButtonClass,
} from "@/components/ui";
import { mandirKit } from "@/lib/season-kit";
import { CommitteeTodo } from "@/components/committee-todo";
import { VisitingFields } from "@/components/visiting-fields";
import { getCurrentUser } from "@/lib/auth";
import { eventCount, shortSevaShifts } from "@/lib/committee-facts";
import type { CommitteeFacts } from "@/lib/committee-tasks";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { formatEventStart, londonDate } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { inviteShareText, whatsAppLink } from "@/lib/share";
import { pageTitle, siteUrl } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { ConfirmButton } from "@/components/confirm-button";
import { EventFields } from "@/components/event-fields";
import { FORM_ERRORS } from "@/lib/mandir-form";
import { DUPLICATE_ERRORS, MERGED } from "@/lib/duplicates";
import { draftFrom } from "@/lib/duplicate-check";
import { EVENT_ERRORS, eventInputFromEvent } from "@/lib/event-form";
import { posterFrom } from "@/lib/posters";
import { QuickPicks } from "@/components/quick-picks";
import { ReviewItem } from "@/components/review-item";
import { eventCandidates, withDuplicates } from "@/lib/review-queue";
import {
  festivalPicks,
  lastYearPicks,
  lastYearWindow,
} from "@/lib/quick-events";
import {
  addEvent,
  addPickedEvents,
  cancelInvite,
  changeEvent,
  inviteMember,
  removeMember,
  reviewPosterAsCommittee,
  updatePracticalDetails,
} from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Manage your mandir"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...FORM_ERRORS,
  ...EVENT_ERRORS,
  poster:
    "That poster can't be published as it is (for example, the date has passed). Choose \u201cNot right\u201d and add the event yourself.",
  done: "Someone has already dealt with that poster.",
  none: "Tick at least one event to add.",
  "invite-email": "Please enter their email address.",
  "invite-member": "They're already on your committee.",
  "invite-too-many":
    "You have five invites waiting. Cancel one, or wait for them to be accepted.",
  ...DUPLICATE_ERRORS,
  failed: "Something went wrong. Please try again.",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DONE: Record<string, string> = {
  merged: MERGED,
  added: "Added. It's on your public page now.",
  edited: "Saved. Your public page shows the changes.",
  confirm: "Thanks, marked as confirmed today.",
  cancel: "Marked as cancelled. Visitors will see that it's off.",
  restore: "Back on. Visitors will see it as happening.",
  remove: "Removed from your page.",
  details: "Saved. Your public page shows the new details.",
  published: "Published. It's on your public page now.",
  discarded: "Thanks. That poster won't be published.",
  invited:
    "Invited. Now send them the message under \u201cWaiting to accept\u201d so they know.",
  uninvited: "Invite cancelled.",
  removed: "Taken off your committee.",
  joined: "Welcome. You now help run this mandir's page on Toran.",
};

export default function ManagePage(props: PageProps<"/manage/[slug]">) {
  return (
    <PageShell title="Manage your mandir">
      <Suspense fallback={<Loading />}>
        <Manage {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Manage({ params, searchParams }: PageProps<"/manage/[slug]">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/manage/${slug}`)}`);

  const supabase = await createSessionClient();
  const { data: mandir } = supabase
    ? await supabase
        .from("mandirs")
        .select(
          "id, slug, name, town, postcode, website, phone, calendar, getting_there, facilities, visiting_note",
        )
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };
  if (!mandir) notFound();

  const { data: admin } = await supabase!
    .from("mandir_admins")
    .select("mandir_id")
    .eq("mandir_id", mandir.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin && !(user.isToranAdmin && user.aal === "aal2")) notFound();

  const from = `${londonDate()}T00:00:00Z`;
  const { data: rows } = await supabase!
    .from("events")
    .select(
      "id, title, summary, starts_at, all_day, status, confirmed_at, recurrence, festival_date_id, event_occurrences (starts_at, cancelled)",
    )
    .eq("mandir_id", mandir.id)
    .neq("status", "removed")
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from)
    .order("starts_at")
    .limit(100);
  const events = withNextStart(rows ?? [], from);
  const { data: claims } = await supabase!
    .from("event_claims")
    .select("id, proposed")
    .eq("mandir_id", mandir.id)
    .eq("status", "pending")
    .order("created_at");
  const posters = (claims ?? []).flatMap((c) => {
    const poster = posterFrom(c.proposed);
    return poster ? [{ id: c.id, poster }] : [];
  });

  // Who runs the page, and who has been invited.
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase!.rpc("committee_members", { target: mandir.id }),
    supabase!
      .from("mandir_invites")
      .select("id, email, expires_at")
      .eq("mandir_id", mandir.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at"),
  ]);

  // Festivals coming up and last year's events, ready to tick.
  const today = londonDate();
  const pastRange = lastYearWindow(today);
  const [{ data: festivalDates }, { data: past }] = await Promise.all([
    supabase!
      .from("festival_dates")
      .select(
        "id, festival_id, calendar, starts_on, festival:festivals (slug, name)",
      )
      .gte("starts_on", pastRange.from.slice(0, 10))
      .order("starts_on"),
    supabase!
      .from("events")
      .select(
        "title, summary, title_gu, summary_gu, kind, starts_at, all_day, festival_date:festival_dates (festival_id, starts_on)",
      )
      .eq("mandir_id", mandir.id)
      .eq("status", "published")
      .is("recurrence", null)
      .gte("starts_at", pastRange.from)
      .lt("starts_at", pastRange.to)
      .order("starts_at")
      .limit(100),
  ]);
  const festivals = festivalPicks(
    festivalDates ?? [],
    mandir.calendar,
    events,
    today,
  );
  const lastYear = lastYearPicks(
    past ?? [],
    festivalDates ?? [],
    mandir.calendar,
    events,
    today,
  );

  // Posters waiting, each checked against what's already on the page.
  const posterItems = withDuplicates(
    posters.map((p) => ({ ...p, mandirId: mandir.id })),
    await eventCandidates(supabase!, [mandir.id], today),
  );

  // The festival coming up, if the mandir has events for it.
  const kit = await mandirKit(mandir.slug);
  const facts: CommitteeFacts = {
    slug: mandir.slug,
    today,
    now: new Date(),
    events,
    posters: posters.length,
    festivals: festivals.map((p) => ({ title: p.title, date: p.date })),
    shortShifts: await shortSevaShifts(supabase!, events),
    eventsEver: Math.max(
      (await eventCount(supabase!, mandir.id)).count ?? 0,
      events.length,
    ),
    members: members?.length ?? 1,
    invites: invites?.length ?? 0,
    details: mandir,
  };

  const query = await searchParams;
  // "Duplicate": the add form starts with that event's details.
  const copyId = String(query.copy ?? "");
  const fixId = String(query.fix ?? "");
  const { data: copy } = UUID.test(copyId)
    ? await supabase!
        .from("events")
        .select(
          "title, summary, title_gu, summary_gu, kind, starts_at, all_day, recurrence",
        )
        .eq("id", copyId)
        .eq("mandir_id", mandir.id)
        .maybeSingle()
    : { data: null };
  const copyValues = copy
    ? {
        ...eventInputFromEvent({ ...copy, next_starts_at: copy.starts_at }),
        date: "",
        until: "",
      }
    : undefined;

  // The add form sent back to ask about events already on the page
  // ("dup": surely the same; "maybe": the committee says).
  const draft = draftFrom(query.draft);
  const askIds = String(query.maybe ?? query.dup ?? "")
    .split(",")
    .filter((id) => UUID.test(id))
    .slice(0, 5);
  const { data: lookalikes } = askIds.length
    ? await supabase!
        .from("events")
        .select("id, title, starts_at, all_day")
        .in("id", askIds)
        .eq("mandir_id", mandir.id)
    : { data: [] };
  const asking = query.maybe ? (lookalikes ?? []) : [];
  const formValues = copyValues ?? draft ?? undefined;

  const error = ERRORS[String(query.error ?? "")];
  const added = Number(query.added ?? 0);
  const skipped = Number(query.skipped ?? 0);
  const leftOut = skipped
    ? ` ${skipped === 1 ? "One was" : `${skipped} were`} already on your page, so ${skipped === 1 ? "it wasn't" : "they weren't"} added again.`
    : "";
  const done =
    added > 1
      ? `Added ${added} events. They're on your public page now.${leftOut}`
      : added === 1
        ? `${DONE.added}${leftOut}`
        : skipped
          ? leftOut.trim()
          : DONE[String(query.done ?? "")];

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold">
            {mandir.name}, {mandir.town}
          </p>
          <Link
            href={`/mandirs/${mandir.slug}`}
            className="text-peacock w-fit font-semibold underline"
          >
            See your public page
          </Link>
        </div>
        <nav aria-label="On this page">
          <ul className="flex flex-wrap gap-2">
            {[
              ["#upcoming", `Coming up (${events.length})`],
              ...(festivals.length ? [["#festivals", "Festivals"]] : []),
              ["#add-event", "Add an event"],
              [`/manage/${mandir.slug}/seva`, "Seva"],
              [`/manage/${mandir.slug}/numbers`, "Numbers"],
              ["#committee", "Committee"],
              ["#details", "Details"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className={pillButtonClass}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <CommitteeTodo facts={facts} />

      {kit && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">
            Share your {kit.season.period} programme
          </h2>
          <p className="text-muted">
            A picture and a message for your WhatsApp groups, and a sheet for
            the noticeboard, made from the {kit.events.length}{" "}
            {kit.events.length === 1 ? "event" : "events"} you have on Toran for{" "}
            {kit.season.period}. They change when your events do.
          </p>
          <Link
            href={`/mandirs/${mandir.slug}/kit/${kit.season.slug}`}
            className={`${buttonClass} self-start`}
          >
            Get the picture and sheet
          </Link>
        </Card>
      )}

      {posters.length > 0 && (
        <Card>
          <h2
            id="posters"
            className="scroll-mt-24 text-xl font-bold sm:text-2xl"
          >
            Posters waiting for you
          </h2>
          <p className="text-muted">
            Someone sent Toran {posters.length === 1 ? "this" : "these"} for
            your mandir. If the details are right, publish. If something&apos;s
            wrong, choose &ldquo;Fix something first&rdquo;; if it isn&apos;t
            happening, discard it.
          </p>
          <ul className="flex flex-col gap-3">
            {posterItems.map((item) => (
              <ReviewItem
                key={item.id}
                id={item.id}
                mandirSlug={mandir.slug}
                poster={item.poster}
                duplicates={item.duplicates}
                action={reviewPosterAsCommittee}
                hidden={{ slug: mandir.slug }}
                canPublish
                fixing={fixId === item.id}
                fixHref={`/manage/${mandir.slug}?fix=${item.id}#item-${item.id}`}
                cancelHref={`/manage/${mandir.slug}#item-${item.id}`}
              />
            ))}
          </ul>
        </Card>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="upcoming">
        <h2
          id="upcoming"
          className="scroll-mt-24 text-xl font-bold sm:text-2xl"
        >
          Coming up
        </h2>
        {events?.length ? (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="border-line bg-surface shadow-card flex flex-col gap-2 rounded-2xl border p-4"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-marigold-ink font-semibold">
                    {event.recurrence && (
                      <span className="text-ink">
                        {describeRule(event.recurrence)} · next{" "}
                      </span>
                    )}
                    {formatEventStart(event.next_starts_at, event.all_day)}
                  </p>
                  <p className="text-lg leading-snug font-bold">
                    {event.title}
                  </p>
                  {event.status === "cancelled" && (
                    <p>
                      <Badge tone="kumkum">Cancelled</Badge>
                    </p>
                  )}
                </div>
                <form action={changeEvent} className="flex flex-wrap gap-2">
                  <input type="hidden" name="slug" value={mandir.slug} />
                  <input type="hidden" name="event" value={event.id} />
                  {event.status === "cancelled" ? (
                    <EventButton intent="restore">
                      It&apos;s back on
                    </EventButton>
                  ) : (
                    <>
                      <EventButton intent="confirm">Still on</EventButton>
                      <EventButton intent="cancel">Cancel</EventButton>
                    </>
                  )}
                  <Link
                    href={`/manage/${mandir.slug}/events/${event.id}`}
                    className={pillButtonClass}
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/manage/${mandir.slug}?copy=${event.id}#add-event`}
                    className={pillButtonClass}
                  >
                    Duplicate
                  </Link>
                  {event.status !== "cancelled" && (
                    <Link
                      href={`/manage/${mandir.slug}/seva/${event.id}`}
                      className={pillButtonClass}
                    >
                      Seva rota
                    </Link>
                  )}
                  <ConfirmButton
                    name="intent"
                    value="remove"
                    question={`Remove "${event.title}" from your page?`}
                    className={pillButtonClass}
                  >
                    Remove
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            Nothing coming up yet. Events you add appear here and on your public
            page.
          </p>
        )}
      </section>

      {festivals.length > 0 && (
        <Card>
          <h2
            id="festivals"
            className="scroll-mt-24 text-xl font-bold sm:text-2xl"
          >
            Festivals coming up
          </h2>
          <p className="text-muted">
            Tick the ones your mandir is celebrating, change the name or add a
            start time if you like, and add them all at once.
          </p>
          <QuickPicks
            slug={mandir.slug}
            picks={festivals}
            action={addPickedEvents}
            button="Add the ticked festivals"
          />
        </Card>
      )}

      {lastYear.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">Again this year?</h2>
          <p className="text-muted">
            Your events from this time last year, moved to this year&apos;s
            dates. Festival events follow this year&apos;s festival date. Check
            each date, then tick the ones that are happening again.
          </p>
          <QuickPicks
            slug={mandir.slug}
            picks={lastYear}
            action={addPickedEvents}
            button="Add the ticked events"
          />
        </Card>
      )}

      <Card>
        <h2
          id="add-event"
          className="scroll-mt-24 text-xl font-bold sm:text-2xl"
        >
          {copy ? `Add a copy of \u201c${copy.title}\u201d` : "Add an event"}
        </h2>
        {copy && (
          <p className="text-muted">
            Everything is filled in from that event: choose the new date.{" "}
            <Link
              href={`/manage/${mandir.slug}#add-event`}
              className="text-peacock font-semibold underline"
            >
              Start blank instead
            </Link>
          </p>
        )}
        {query.dup && lookalikes?.[0] && (
          <p className="bg-sunk rounded-2xl p-4">
            Already on your page:{" "}
            <Link
              href={`/manage/${mandir.slug}/events/${lookalikes[0].id}`}
              className="text-peacock font-semibold underline"
            >
              {lookalikes[0].title},{" "}
              {formatEventStart(lookalikes[0].starts_at, lookalikes[0].all_day)}
            </Link>
            . Change that one instead.
          </p>
        )}
        <form
          key={copy ? copyId : draft ? String(query.draft) : "blank"}
          action={addEvent}
          className="flex flex-col gap-5"
        >
          <input type="hidden" name="slug" value={mandir.slug} />
          {asking.length > 0 && (
            <div
              role="note"
              className="border-marigold bg-marigold/10 flex flex-col gap-2 rounded-xl border-l-4 px-4 py-3"
            >
              <p className="font-semibold">Is this already on your page?</p>
              <ul className="flex flex-col gap-1">
                {asking.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/manage/${mandir.slug}/events/${e.id}`}
                      className="text-peacock font-semibold underline"
                    >
                      {e.title}
                    </Link>
                    , {formatEventStart(e.starts_at, e.all_day)}
                  </li>
                ))}
              </ul>
              <p className="text-muted text-base">
                If it&apos;s the same event, change that one instead, so
                it&apos;s only listed once.
              </p>
              <label className="flex items-start gap-3 font-semibold">
                <input
                  type="checkbox"
                  name="different"
                  value={asking.map((e) => e.id).join(",")}
                  required
                  className="mt-1 size-5"
                />
                It&apos;s a different event: add it as well
              </label>
            </div>
          )}
          <EventFields gujarati kinds values={formValues} />
          <button type="submit" className={buttonClass}>
            Add event
          </button>
        </form>
      </Card>

      <Card>
        <h2
          id="committee"
          className="scroll-mt-24 text-xl font-bold sm:text-2xl"
        >
          Your committee on Toran
        </h2>
        <p className="text-muted">
          Everyone here can add and change your mandir&apos;s events. Invite a
          colleague so you&apos;re not the only one.
        </p>
        <ul className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <li
              key={member.user_id}
              className="border-line flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4"
            >
              <span className="break-all">
                <span className="font-semibold">{member.email}</span>
                {member.user_id === user.id && (
                  <span className="text-muted"> (you)</span>
                )}
              </span>
              {(member.user_id === user.id || member.added_by_me) && (
                <form action={removeMember}>
                  <input type="hidden" name="slug" value={mandir.slug} />
                  <input type="hidden" name="member" value={member.user_id} />
                  <ConfirmButton
                    question={
                      member.user_id === user.id
                        ? `Stop helping run ${mandir.name} on Toran?`
                        : `Take ${member.email} off your committee?`
                    }
                    className={pillButtonClass}
                  >
                    {member.user_id === user.id ? "Leave" : "Remove"}
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        {invites && invites.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold">Waiting to accept</h3>
            <p className="text-muted text-base">
              Toran doesn&apos;t email them, so send them the message yourself.
            </p>
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="border-line flex flex-col gap-3 rounded-2xl border p-4"
                >
                  <p>
                    <span className="font-semibold break-all">
                      {invite.email}
                    </span>
                    <span className="text-muted text-base">
                      {" "}
                      · until {formatEventStart(invite.expires_at, true)}
                    </span>
                  </p>
                  <form action={cancelInvite} className="flex flex-wrap gap-2">
                    <input type="hidden" name="slug" value={mandir.slug} />
                    <input type="hidden" name="invite" value={invite.id} />
                    <a
                      href={whatsAppLink(
                        inviteShareText(mandir, invite.email),
                        `${siteUrl()}/account`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pillPrimaryClass}
                    >
                      Send on WhatsApp
                    </a>
                    <button type="submit" className={pillButtonClass}>
                      Cancel invite
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form action={inviteMember} className="flex flex-col gap-3">
          <input type="hidden" name="slug" value={mandir.slug} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Their email address</span>
            <span className="text-muted -mt-1 text-base">
              They log in with this address to accept. The invite lasts 14 days.
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className={inputClass}
            />
          </label>
          <button type="submit" className={quietButtonClass}>
            Invite
          </button>
        </form>
      </Card>

      <Card>
        <h2 id="details" className="scroll-mt-24 text-xl font-bold sm:text-2xl">
          Your mandir&apos;s details
        </h2>
        <p className="text-muted">
          Shown on your public page. To change the mandir&apos;s name or town,
          ask Toran.
        </p>
        <form action={updatePracticalDetails} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Postcode</span>
            <input
              name="postcode"
              autoComplete="off"
              defaultValue={mandir.postcode ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Website</span>
            <input
              name="website"
              inputMode="url"
              defaultValue={mandir.website ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Mandir phone number</span>
            <span className="text-muted -mt-1 text-base">
              The mandir&apos;s own number, not a personal mobile, as it&apos;s
              shown publicly.
            </span>
            <input
              name="phone"
              type="tel"
              defaultValue={mandir.phone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Getting there</span>
            <span className="text-muted -mt-1 text-base">
              Parking, which entrance to use, the nearest station or bus. Shown
              on your page and with every event, next to directions.
            </span>
            <textarea
              name="getting_there"
              rows={3}
              maxLength={400}
              defaultValue={mandir.getting_there ?? ""}
              placeholder="e.g. Free parking behind the hall. Enter by the side gate on Station Road."
              className={inputClass}
            />
          </label>
          <VisitingFields
            facilities={mandir.facilities}
            note={mandir.visiting_note}
          />
          <button type="submit" className={quietButtonClass}>
            Save details
          </button>
        </form>
      </Card>
    </>
  );
}

function EventButton({
  intent,
  children,
}: {
  intent: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={pillButtonClass}
    >
      {children}
    </button>
  );
}
