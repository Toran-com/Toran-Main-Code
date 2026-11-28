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
  pillButtonClass,
  pillPrimaryClass,
  quietButtonClass,
} from "@/components/ui";
import { CommitteeBar } from "@/components/committee-bar";
import { PageShell } from "@/components/page-shell";
import { mandirKit } from "@/lib/season-kit";
import { CopyText } from "@/components/copy-text";
import { PosterPicture } from "@/components/poster-picture";
import { CHANGES_DAYS, recentChanges } from "@/lib/committee-changes";
import { weekEvents, weekMessage } from "@/lib/committee-week";
import {
  forwardingAddress,
  inboundDomain,
  inboundEmailOn,
} from "@/lib/inbound-email";
import { MAX_MESSAGE_CHARS, posterReadingOn } from "@/lib/poster-reader";
import { CommitteeTodo } from "@/components/committee-todo";
import { NoticeForm } from "@/components/notice-form";
import { AddEvents, Sheet, type AddWay } from "@/components/sheet";
import { PhotoPicker } from "@/components/photo-picker";
import { photoUrl } from "@/lib/mandir-photo";
import { VisitingFields } from "@/components/visiting-fields";
import { HoursFields } from "@/components/hours-fields";
import { readAartis, readSessions } from "@/lib/opening-hours";
import { getCurrentUser } from "@/lib/auth";
import { eventCount, shortSevaShifts } from "@/lib/committee-facts";
import type { CommitteeFacts } from "@/lib/committee-tasks";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { feedLabel } from "@/lib/calendar-feed";
import {
  formatClock,
  formatDay,
  formatDays,
  formatEventStart,
  londonDate,
} from "@/lib/format";
import { NOTICE_MAX, NOTICE_PICKS } from "@/lib/notices";
import { describeRule } from "@/lib/recurrence";
import { inviteShareText, whatsAppLink } from "@/lib/share";
import { pageTitle, siteUrl } from "@/lib/site";
import { GUIDE_PATH } from "@/lib/committee-guide";
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
  askWebsiteHelp,
  connectWebsite,
  createApiKey,
  disconnectWebsite,
  giveConsent,
  inviteMember,
  removeCalendar,
  removeMember,
  readMessageAsCommittee,
  readPosterAsCommittee,
  removePhoto,
  reviewPosterAsCommittee,
  saveCalendar,
  savePhoto,
  postNotice,
  removeNotice,
  revokeApiKey,
  saveWebsiteSettings,
  updatePracticalDetails,
} from "./actions";
import { WebsiteConnectForm } from "@/components/website-connect";
import { ApiKeyMaker } from "@/components/api-keys";
import { EVENTS_API_PATH } from "@/lib/events-api";

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
  "calendar-empty": "Paste your calendar's address first.",
  "api-failed": "That didn't work. Try again.",
  "website-failed": "That didn't work. Try again.",
  "calendar-address":
    "That doesn't look like a calendar address. Copy the iCal address (it often ends in .ics) from your calendar's settings.",
  ...DUPLICATE_ERRORS,
  readingOff:
    "Reading posters isn't switched on yet. Please add the event below.",
  picture: "Please choose a photo or PDF of the poster.",
  pictureType: "Please send a JPEG, PNG, WebP or GIF photo, or a PDF.",
  pictureSize:
    "That file is over 4 MB. Try a smaller photo, or one page of the PDF.",
  pictureRefused:
    "That picture couldn't be read. Please add the event below instead.",
  pictureFailed:
    "The poster couldn't be read just now. Please try again, or add the event below.",
  message: "Please paste the message first.",
  messageLong:
    "That message is very long. Please paste just the part about the events.",
  messageRefused:
    "That message couldn't be read. Please add the event yourself instead.",
  slow: "You've sent a few posters just now. Please wait ten minutes, or add the event below.",
  "photo-agree":
    "Please tick to say it's a photo of the building, with no people in it.",
  "photo-none": "Please choose a photo first.",
  "photo-size": "That photo is too big. Please try a smaller one.",
  "photo-failed": "The photo couldn't be saved just now. Please try again.",
  consent: "Please tick the box first.",
  "notice-text": "Please write the notice: between 3 and 200 characters.",
  "notice-date": "Please choose how long it shows: up to a month from today.",
  "notice-many": "Three notices are showing already. Remove one first.",
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
  photo: "Saved. Your photo is at the top of your public page.",
  "photo-removed": "Photo removed from your page.",
  published: "Published. It's on your public page now.",
  discarded: "Thanks. That poster won't be published.",
  invited:
    "Invited. Now send them the message under \u201cWaiting to accept\u201d so they know.",
  uninvited: "Invite cancelled.",
  removed: "Taken off your committee.",
  joined: "Welcome. You now help run this mandir's page on Toran.",
  calendar:
    "Saved. Toran reads your calendar tonight, and new events will wait here for you to check.",
  "calendar-removed": "Toran won't read your calendar any more.",
  "api-stopped":
    "That key no longer works. Events it put on your page stay there.",
  "website-saved": "Saved.",
  "website-off":
    "Toran won't read your website any more. Events it added stay on your page.",
  "website-help":
    "Thanks. Toran's team will be in touch to help connect your website.",
  consent: "Thanks. That's recorded.",
  notice:
    "Posted. It's at the top of your public page and your events' pages until its last day.",
  "notice-removed": "Notice removed from your page.",
};

// Connecting a website reads it while the committee waits, then reads a
// couple of its posters afterwards (lib/website-connect.ts).
export const maxDuration = 120;

export default function ManagePage(props: PageProps<"/manage/[slug]">) {
  return (
    <PageShell title="Manage your mandir" full>
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
          "id, slug, name, town, postcode, website, live_url, donate_url, request_types, phone, photo_path, calendar, getting_there, facilities, visiting_note, opening_hours, aarti_times",
        )
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };
  if (!mandir) notFound();

  const { data: admin } = await supabase!
    .from("mandir_admins")
    .select("mandir_id, consented_at")
    .eq("mandir_id", mandir.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin && !(user.isToranAdmin && user.aal === "aal2")) notFound();

  const { data: calendar } = await supabase!
    .from("mandir_calendars")
    .select("url, last_read_at, last_outcome, last_found, last_added")
    .eq("mandir_id", mandir.id)
    .maybeSingle();
  // The mandir's own website, if the committee connected it (decision
  // 0032), and keys for a web developer's own system.
  const { data: connection } = await supabase!
    .from("website_connections")
    .select(
      "website, auto_publish, read_posters, last_checked_at, last_outcome, last_found, last_published, last_queued, last_posters, help_asked_at",
    )
    .eq("mandir_id", mandir.id)
    .maybeSingle();
  const { data: apiKeys } = await supabase!
    .from("mandir_api_keys")
    .select("id, label, prefix, created_at, last_used_at")
    .eq("mandir_id", mandir.id)
    .is("revoked_at", null)
    .order("created_at");
  const { count: apiEventCount } = await supabase!
    .from("api_events")
    .select("event_id", { count: "exact", head: true })
    .eq("mandir_id", mandir.id);

  const from = `${londonDate()}T00:00:00Z`;
  const { data: rows } = await supabase!
    .from("events")
    .select(
      "id, title, summary, starts_at, all_day, status, confirmed_at, recurrence, festival_date_id, origin, event_occurrences (starts_at, cancelled)",
    )
    .eq("mandir_id", mandir.id)
    .neq("status", "removed")
    .or(upcomingFilter(from))
    .gte("event_occurrences.starts_at", from)
    .order("starts_at")
    .limit(100);
  // The daily aarti from the mandir's details (lib/aarti-events.ts) is
  // kept apart: it's in What's on every day, but not in this list, this
  // week's message or the "Still on?" reminders.
  const all = withNextStart(rows ?? [], from);
  const events = all.filter((e) => e.origin !== "aarti");
  const dailyAarti = all.filter((e) => e.origin === "aarti");
  const aartis = readAartis(mandir.aarti_times);
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

  // Who runs the page, who has been invited, and what's changed lately.
  const now = new Date();
  const changesSince = new Date(
    now.getTime() - CHANGES_DAYS * 86_400_000,
  ).toISOString();
  const [{ data: members }, { data: invites }, { data: changed }] =
    await Promise.all([
      supabase!.rpc("committee_members", { target: mandir.id }),
      supabase!
        .from("mandir_invites")
        .select("id, email, expires_at")
        .eq("mandir_id", mandir.id)
        .gt("expires_at", new Date().toISOString())
        .order("created_at"),
      supabase!
        .from("events")
        .select("id, title, status, origin, created_at, created_by, updated_at")
        .eq("mandir_id", mandir.id)
        .gte("updated_at", changesSince)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);
  const changes = recentChanges(
    changed ?? [],
    user.id,
    new Set((members ?? []).map((m) => m.user_id)),
    now,
  );
  const thisWeek = weekEvents(events, now);
  const { data: notices } = await supabase!
    .from("mandir_notices")
    .select("id, body, until_on")
    .eq("mandir_id", mandir.id)
    .gte("until_on", londonDate())
    .order("created_at", { ascending: false });
  const publicUrl = `${siteUrl()}/mandirs/${mandir.slug}`;

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
    shortShifts: await shortSevaShifts(supabase!, mandir.id),
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
          "title, summary, title_gu, summary_gu, kind, starts_at, ends_at, all_day, recurrence",
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

  // A message shared to Toran from WhatsApp (app/(mandir)/share), ready
  // to read.
  const paste = String(query.paste ?? "").slice(0, MAX_MESSAGE_CHARS);
  const error = ERRORS[String(query.error ?? "")];
  const added = Number(query.added ?? 0);
  const skipped = Number(query.skipped ?? 0);
  const leftOut = skipped
    ? ` ${skipped === 1 ? "One was" : `${skipped} were`} already on your page, so ${skipped === 1 ? "it wasn't" : "they weren't"} added again.`
    : "";
  const read = Number(query.read ?? -1);
  const what = query.from === "message" ? "message" : "poster";
  const readDone =
    read > 0
      ? `Read ${read === 1 ? "1 event" : `${read} events`} ${what === "message" ? "from your message" : "off your poster"}. Check ${read === 1 ? "it" : "them"} below, then publish.`
      : read === 0
        ? skipped
          ? `Everything in that ${what} is already on your page or waiting below.`
          : `No dated events could be read from that ${what}. Please add them below.`
        : null;
  const done =
    readDone ??
    (added > 1
      ? `Added ${added} events. They're on your public page now.${leftOut}`
      : added === 1
        ? `${DONE.added}${leftOut}`
        : skipped
          ? leftOut.trim()
          : DONE[String(query.done ?? "")]);

  // Which sheet to open as the page comes back, to show what went wrong
  // or what to do next, with the message in it.
  const errorKey = String(query.error ?? "");
  const doneKey = String(query.done ?? "");
  const addOpen =
    copy || query.new || query.dup || query.maybe || errorKey in EVENT_ERRORS
      ? "add-event"
      : paste || ["message", "messageLong", "messageRefused"].includes(errorKey)
        ? "read-message"
        : [
              "readingOff",
              "picture",
              "pictureType",
              "pictureSize",
              "pictureRefused",
              "pictureFailed",
              "slow",
            ].includes(errorKey)
          ? "read-poster"
          : errorKey === "none"
            ? festivals.length
              ? "festivals"
              : "again"
            : /^(website|api)-/.test(doneKey) ||
                /^(website|api)-/.test(errorKey)
              ? "connect-website"
              : undefined;
  const focus =
    addOpen ??
    (["invited", "uninvited", "removed", "joined"].includes(doneKey) ||
    errorKey.startsWith("invite-")
      ? "committee"
      : errorKey.startsWith("photo-")
        ? "photo"
        : errorKey in FORM_ERRORS
          ? "details"
          : ["calendar", "calendar-removed"].includes(doneKey) ||
              errorKey.startsWith("calendar-")
            ? "calendar"
            : ["notice", "notice-removed"].includes(doneKey) ||
                errorKey.startsWith("notice-")
              ? "notices"
              : undefined);
  const notice = error ? (
    <Notice tone="error">{error}</Notice>
  ) : done ? (
    <Notice tone="success">{done}</Notice>
  ) : null;
  const inSheet = (id: string) => (focus === id ? notice : null);
  const stamp = now.getTime();

  const ways: AddWay[] = [];
  if (posterReadingOn()) {
    ways.push({
      id: "read-poster",
      icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
      title: "Photo of a poster",
      body: "Toran reads it and fills in the events for you to check.",
      content: (
        <>
          <p className="text-muted">
            Take a photo of the poster, or choose one. Toran reads the events
            off it; they wait under &ldquo;Posters waiting for you&rdquo; until
            you check and publish them. The photo isn&apos;t kept.
          </p>
          <PosterPicture
            action={readPosterAsCommittee}
            chosen={mandir.slug}
            label="Photo or PDF of your poster"
          />
        </>
      ),
    });
    ways.push({
      id: "read-message",
      icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
      title: "Paste a WhatsApp message",
      body: "Copy it from WhatsApp, paste it, and Toran fills it in.",
      content: (
        <>
          <p className="text-muted">
            In WhatsApp, press and hold the message, then Copy. Paste it here.
            The events wait under &ldquo;Posters waiting for you&rdquo; until
            you check them. The message isn&apos;t kept.
          </p>
          <form action={readMessageAsCommittee} className="flex flex-col gap-4">
            <input type="hidden" name="mandir" value={mandir.slug} />
            <label className="flex flex-col gap-2">
              <span className="font-semibold">The message</span>
              <textarea
                name="message"
                required
                minLength={10}
                maxLength={MAX_MESSAGE_CHARS}
                rows={6}
                className={inputClass}
                placeholder="Jai Shri Krishna 🙏 This Sunday 8 Nov, Diwali Lakshmi puja at 6.30pm…"
                defaultValue={paste}
              />
            </label>
            <button type="submit" className={buttonClass}>
              Read the message
            </button>
          </form>
        </>
      ),
    });
  }
  const forwardDomain = inboundEmailOn() ? inboundDomain() : null;
  if (forwardDomain) {
    const address = forwardingAddress(mandir.slug, forwardDomain);
    ways.push({
      id: "forward-email",
      icon: "M3 6h18v12H3zM3 7l9 6 9-6",
      title: "Forward it by email",
      body: "Send posters and messages to your mandir's own Toran address.",
      content: (
        <>
          <p className="text-muted">
            Forward an email with a poster, a PDF patrika or the details of an
            event to this address. Toran reads the events and they wait under
            &ldquo;Posters waiting for you&rdquo; for you to check. You get a
            reply saying what it found.
          </p>
          <div className="bg-sunk flex flex-col gap-2 rounded-2xl p-4">
            <p
              className="font-semibold break-all"
              data-testid="forward-address"
            >
              {address}
            </p>
            <CopyText text={address} label="Copy the address" />
          </div>
          <p className="text-muted">
            Send it from the address you log in with
            {user.email ? (
              <>
                {" "}
                (<span className="font-semibold break-all">{user.email}</span>)
              </>
            ) : null}
            : Toran only reads emails from this mandir&apos;s committee. Save
            the address as a contact, say &ldquo;Toran events&rdquo;, to find it
            quickly. The email isn&apos;t kept.
          </p>
        </>
      ),
    });
  }
  ways.push({
    id: "connect-website",
    icon: "M4 5h16v11H4zM8 20h8M12 16v4M9 10l2 2 4-4",
    title: "Connect your website",
    badge: connection ? "Connected" : undefined,
    body: connection
      ? "Toran keeps up with your website every night."
      : "One button: Toran adds the events from your website, every night.",
    content: (
      <ConnectWebsite
        slug={mandir.slug}
        website={mandir.website ?? ""}
        connection={connection}
        forwardTo={
          forwardDomain ? forwardingAddress(mandir.slug, forwardDomain) : null
        }
        apiKeys={apiKeys ?? []}
        apiEvents={apiEventCount ?? 0}
      />
    ),
  });
  ways.push({
    id: "add-event",
    icon: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
    title: copy ? `Copy of “${copy.title}”` : "Type it in",
    body: "The name, the date and the time. Everything else is optional.",
    content: (
      <>
        {copy && (
          <p className="text-muted">
            Everything is filled in from that event: choose the new date.{" "}
            <Link
              href={`/manage/${mandir.slug}?new=1`}
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
          <EventFields
            gujarati
            kinds
            tickets
            place
            languages
            values={formValues}
          />
          <button type="submit" className={buttonClass}>
            Add event
          </button>
        </form>
      </>
    ),
  });
  if (festivals.length) {
    ways.push({
      id: "festivals",
      icon: "M5 12l4 4 10-10M5 19h14",
      title: "Tick festivals",
      body: "Festivals coming up, ready to add in a few taps.",
      badge: `${festivals.length}`,
      content: (
        <>
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
        </>
      ),
    });
  }
  if (lastYear.length) {
    ways.push({
      id: "again",
      icon: "M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4",
      title: "Again this year?",
      body: "Your events from this time last year, moved to this year.",
      badge: `${lastYear.length}`,
      content: (
        <>
          <p className="text-muted">
            Festival events follow this year&apos;s festival date. Check each
            date, then tick the ones that are happening again.
          </p>
          <QuickPicks
            slug={mandir.slug}
            picks={lastYear}
            action={addPickedEvents}
            button="Add the ticked events"
          />
        </>
      ),
    });
  }

  const SHOWN = 6;
  const eventRow = (event: (typeof events)[number]) => (
    <li key={event.id} className="flex items-center gap-1">
      <Link
        href={`/manage/${mandir.slug}/events/${event.id}`}
        className="hover:bg-sunk text-ink flex min-w-0 flex-1 flex-col rounded-2xl px-3 py-2.5 no-underline transition"
      >
        <span className="text-marigold-ink text-base font-semibold">
          {event.recurrence && `${describeRule(event.recurrence)} · next `}
          {formatEventStart(event.next_starts_at, event.all_day)}
        </span>
        <span className="line-clamp-2 leading-snug font-semibold">
          {event.title}
        </span>
        {event.status === "cancelled" && (
          <span className="mt-1">
            <Badge tone="kumkum">Cancelled</Badge>
          </span>
        )}
      </Link>
      <Sheet
        id={`event-${event.id}`}
        title={event.title}
        stamp={stamp}
        triggerLabel={`More for ${event.title}`}
        triggerClass="hover:bg-sunk text-muted hover:text-ink grid size-11 shrink-0 cursor-pointer place-items-center rounded-full transition active:scale-95"
        trigger={
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
            <circle cx="5" cy="12" r="2" fill="currentColor" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="19" cy="12" r="2" fill="currentColor" />
          </svg>
        }
      >
        <p className="text-marigold-ink -mt-1 font-semibold">
          {formatEventStart(event.next_starts_at, event.all_day)}
        </p>
        <form action={changeEvent} className="flex flex-col gap-2">
          <input type="hidden" name="slug" value={mandir.slug} />
          <input type="hidden" name="event" value={event.id} />
          <Link
            href={`/manage/${mandir.slug}/events/${event.id}`}
            className={menuRowClass}
          >
            Edit
          </Link>
          {event.status === "cancelled" ? (
            <EventButton intent="restore">It&apos;s back on</EventButton>
          ) : (
            <>
              <EventButton intent="confirm">Still on</EventButton>
              <EventButton intent="cancel">Cancel</EventButton>
            </>
          )}
          <Link
            href={`/manage/${mandir.slug}?copy=${event.id}`}
            className={menuRowClass}
          >
            Duplicate
          </Link>
          {event.status !== "cancelled" && (
            <Link
              href={`/manage/${mandir.slug}/seva?event=${event.id}`}
              className={menuRowClass}
            >
              Add seva
            </Link>
          )}
          <ConfirmButton
            name="intent"
            value="remove"
            question={`Remove "${event.title}" from your page?`}
            className={`${menuRowClass} text-kumkum`}
          >
            Remove
          </ConfirmButton>
        </form>
      </Sheet>
    </li>
  );

  const settingRow = (title: string, hint: string) => (
    <>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="font-semibold">{title}</span>
        <span className="text-muted line-clamp-1 text-base">{hint}</span>
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="text-muted size-5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </>
  );
  const settingClass =
    "hover:bg-sunk text-ink flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition active:scale-[0.99]";

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-3xl leading-tight sm:text-4xl">
            {mandir.name}
          </p>
          <p className="text-muted">
            {mandir.town} ·{" "}
            {/* Not prefetched: the committee changes this page from here,
                and a background fetch at the same moment could keep the
                version from before. */}
            <Link
              href={`/mandirs/${mandir.slug}`}
              prefetch={false}
              className="text-peacock font-semibold"
            >
              See your public page<span aria-hidden="true"> ↗</span>
            </Link>
          </p>
        </div>
        <CommitteeBar slug={mandir.slug} current="home" />
      </header>
      {!focus && notice}

      {admin && !admin.consented_at && (
        <Card>
          <h2 className="text-xl font-bold sm:text-2xl">
            One thing to agree to
          </h2>
          <p>
            Toran now asks everyone who helps run a mandir&apos;s page to agree
            to this, because being on a mandir&apos;s committee can show your
            religion.
          </p>
          <form action={giveConsent} className="flex flex-col gap-4">
            <input type="hidden" name="slug" value={mandir.slug} />
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="consent"
                value="yes"
                required
                className="mt-1.5 size-5 shrink-0"
              />
              <span>
                I agree that Toran can record that I help run this mandir. This
                may show my religion. I can withdraw this at any time by leaving
                the committee on Toran.
              </span>
            </label>
            <button type="submit" className={buttonClass}>
              Agree
            </button>
          </form>
          <p className="text-muted text-base">
            If you&apos;d rather not, press &ldquo;Leave&rdquo; under{" "}
            <a href="#committee" className="text-peacock underline">
              Committee
            </a>{" "}
            and Toran will no longer keep that you help run this page.
          </p>
        </Card>
      )}

      {/* On a phone, one column: the button to add events, what needs
          doing, posters to check and what's coming up; then sharing and
          the mandir's settings. Every form waits in a sheet until it's
          wanted (components/sheet.tsx). */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-5">
          <AddEvents
            ways={ways}
            open={addOpen}
            stamp={stamp}
            notice={addOpen ? notice : null}
            help={
              <a
                href={`${GUIDE_PATH}#add`}
                target="_blank"
                rel="noopener"
                className="text-peacock text-base font-semibold"
              >
                Not sure which? See how each way works
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            }
            className={buttonClass}
          />
          <CommitteeTodo facts={facts} />

          {posters.length > 0 && (
            <Card>
              <h2
                id="posters"
                className="scroll-mt-24 text-xl font-bold sm:text-2xl"
              >
                Posters waiting for you
              </h2>
              <p className="text-muted">
                If the details are right, publish. If something&apos;s wrong,
                choose &ldquo;Fix something first&rdquo;; if it isn&apos;t
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

          <section
            aria-labelledby="upcoming"
            className="border-line bg-surface shadow-card flex flex-col rounded-3xl border"
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
              <h2 id="upcoming" className="scroll-mt-24 text-xl font-bold">
                Coming up
                {events.length > 0 && (
                  <span className="text-muted font-normal">
                    {" "}
                    · {events.length}
                  </span>
                )}
              </h2>
              <a href="#add" className={pillButtonClass}>
                <span aria-hidden="true">+</span> Add
              </a>
            </div>
            {events.length ? (
              <ul className="flex flex-col px-2 pb-2">
                {events.slice(0, SHOWN).map(eventRow)}
                {events.length > SHOWN && (
                  <li>
                    <details className="group/all">
                      <summary className="text-peacock flex cursor-pointer list-none items-center gap-1 px-3 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                        <span className="group-open/all:hidden">
                          Show {events.length - SHOWN} more
                        </span>
                        <span className="hidden group-open/all:inline">
                          Show fewer
                        </span>
                      </summary>
                      <ul className="flex flex-col">
                        {events.slice(SHOWN).map(eventRow)}
                      </ul>
                    </details>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-muted px-5 pb-5">
                Nothing coming up yet. A photo of your next poster is the
                quickest way to start.
              </p>
            )}
            {dailyAarti.length > 0 && aartis.length > 0 && (
              <p className="text-muted border-line border-t px-5 py-3 text-base">
                Also in What&apos;s on
                {aartis.every((a) => !a.days) ? " every day" : ""}: your{" "}
                {aartis.length === 1 ? "aarti" : "aartis"} (
                {aartis
                  .map((a) =>
                    [a.name, formatClock(a.time), formatDays(a.days)]
                      .filter(Boolean)
                      .join(" "),
                  )
                  .join(", ")}
                ), from{" "}
                <a href="#details" className="text-peacock font-semibold">
                  your details
                </a>
                .
              </p>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <section
            id="notices"
            aria-labelledby="notices-title"
            className="border-line bg-surface shadow-card flex scroll-mt-24 flex-col gap-3 rounded-3xl border p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="notices-title" className="text-xl font-bold">
                Notice for visitors
              </h2>
              {(notices ?? []).length < 3 && (
                <Sheet
                  id="notice"
                  title="Post a notice"
                  open={focus === "notices" && !!error}
                  stamp={stamp}
                  triggerClass={pillButtonClass}
                  trigger={
                    <>
                      <span aria-hidden="true">+</span> Post a notice
                    </>
                  }
                >
                  {focus === "notices" && error ? notice : null}
                  <NoticeForm
                    slug={mandir.slug}
                    action={postNotice}
                    picks={NOTICE_PICKS}
                    max={NOTICE_MAX}
                    today={londonDate()}
                    lastDay={new Date(
                      Date.parse(`${londonDate()}T00:00:00Z`) + 31 * 86_400_000,
                    )
                      .toISOString()
                      .slice(0, 10)}
                  />
                </Sheet>
              )}
            </div>
            {focus === "notices" && !error && notice}
            {(notices ?? []).length ? (
              <ul className="flex flex-col gap-3">
                {(notices ?? []).map((n) => (
                  <li
                    key={n.id}
                    className="border-marigold bg-marigold/10 flex flex-col gap-2 rounded-2xl border-l-4 px-4 py-3"
                  >
                    <p className="text-marigold-ink text-base font-semibold">
                      {n.until_on === londonDate()
                        ? "Showing today"
                        : `Showing until ${formatDay(n.until_on)}`}
                    </p>
                    <p className="font-semibold break-words">{n.body}</p>
                    <form action={removeNotice}>
                      <input type="hidden" name="slug" value={mandir.slug} />
                      <input type="hidden" name="notice" value={n.id} />
                      <button
                        type="submit"
                        className="text-kumkum inline-flex min-h-11 cursor-pointer items-center text-base font-semibold underline"
                      >
                        Remove this notice
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                Closed for the snow, or aarti at a different time? A notice goes
                at the top of your page and your events&apos; pages, for as long
                as you choose.
              </p>
            )}
          </section>

          {(thisWeek.length > 0 || kit) && (
            <section
              id="share"
              aria-labelledby="share-title"
              className="border-line bg-surface shadow-card flex scroll-mt-24 flex-col gap-3 rounded-3xl border p-5"
            >
              <h2 id="share-title" className="text-xl font-bold">
                Share
              </h2>
              {thisWeek.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p>
                    <span className="font-semibold">
                      This week&apos;s events
                    </span>
                    <span className="text-muted">
                      {" "}
                      · {thisWeek.length} in the next seven days, as one message
                      for your WhatsApp groups
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={whatsAppLink(
                        weekMessage(mandir, thisWeek, publicUrl),
                        "",
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pillPrimaryClass}
                    >
                      Send on WhatsApp
                    </a>
                    <CopyText
                      text={weekMessage(mandir, thisWeek, publicUrl)}
                      label="Copy the message"
                    />
                  </div>
                  <details>
                    <summary className="text-peacock w-fit cursor-pointer py-2.5 text-base font-semibold">
                      See the message
                    </summary>
                    <p className="bg-sunk mt-2 rounded-2xl p-4 text-base break-words whitespace-pre-line">
                      {weekMessage(mandir, thisWeek, publicUrl)}
                    </p>
                  </details>
                </div>
              )}
              {kit && (
                <p
                  className={thisWeek.length ? "border-line border-t pt-3" : ""}
                >
                  <Link
                    href={`/mandirs/${mandir.slug}/kit/${kit.season.slug}`}
                    className="text-peacock font-semibold"
                  >
                    Your {kit.season.period} programme: a picture and a sheet
                    <span aria-hidden="true"> →</span>
                  </Link>
                  <span className="text-muted block text-base">
                    Made from the {kit.events.length}{" "}
                    {kit.events.length === 1 ? "event" : "events"} you have on
                    Toran.
                  </span>
                </p>
              )}
            </section>
          )}

          <section
            aria-labelledby="your-mandir"
            className="border-line bg-surface shadow-card flex flex-col rounded-3xl border"
          >
            <h2 id="your-mandir" className="px-5 pt-4 pb-1 text-xl font-bold">
              Your mandir
            </h2>
            <div className="flex flex-col px-2 pb-2">
              <div>
                <Sheet
                  id="committee"
                  title="Your committee on Toran"
                  open={focus === "committee"}
                  stamp={stamp}
                  triggerClass={settingClass}
                  trigger={settingRow(
                    "Committee",
                    `${(members ?? []).length} on Toran${invites?.length ? `, ${invites.length} invited` : ""}`,
                  )}
                >
                  {inSheet("committee")}
                  <p className="text-muted">
                    Everyone here can add and change your mandir&apos;s events.
                    Invite a colleague so you&apos;re not the only one.
                  </p>
                  <ul className="flex flex-col gap-2">
                    {(members ?? []).map((member) => (
                      <li
                        key={member.user_id}
                        className="border-line flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4"
                      >
                        <span className="min-w-0 break-all">
                          <span className="font-semibold">{member.email}</span>
                          {member.user_id === user.id && (
                            <span className="text-muted"> (you)</span>
                          )}
                        </span>
                        {(member.user_id === user.id || member.added_by_me) && (
                          <form action={removeMember}>
                            <input
                              type="hidden"
                              name="slug"
                              value={mandir.slug}
                            />
                            <input
                              type="hidden"
                              name="member"
                              value={member.user_id}
                            />
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
                      <h3 className="text-lg font-bold">Waiting to accept</h3>
                      <p className="text-muted text-base">
                        Toran doesn&apos;t email them, so send them the message
                        yourself.
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
                                · until{" "}
                                {formatEventStart(invite.expires_at, true)}
                              </span>
                            </p>
                            <form
                              action={cancelInvite}
                              className="flex flex-wrap gap-2"
                            >
                              <input
                                type="hidden"
                                name="slug"
                                value={mandir.slug}
                              />
                              <input
                                type="hidden"
                                name="invite"
                                value={invite.id}
                              />
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
                        They log in with this address to accept. The invite
                        lasts 14 days.
                      </span>
                      <input
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        className={inputClass}
                      />
                    </label>
                    <button type="submit" className={buttonClass}>
                      Invite
                    </button>
                  </form>
                </Sheet>
              </div>
              <div>
                <Sheet
                  id="photo"
                  title="Photo of your mandir"
                  open={focus === "photo"}
                  stamp={stamp}
                  triggerClass={settingClass}
                  trigger={settingRow(
                    "Photo",
                    mandir.photo_path
                      ? "Shown at the top of your page"
                      : "Add one for the top of your page",
                  )}
                >
                  {inSheet("photo")}
                  {mandir.photo_path && photoUrl(mandir.photo_path, 640) && (
                    <div className="flex flex-col gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element -- already the right size */}
                      <img
                        src={photoUrl(mandir.photo_path, 640)!}
                        alt={`${mandir.name} now`}
                        className="aspect-[16/9] w-full rounded-2xl object-cover"
                      />
                      <form action={removePhoto}>
                        <input type="hidden" name="slug" value={mandir.slug} />
                        <button type="submit" className={quietButtonClass}>
                          Remove the photo
                        </button>
                      </form>
                    </div>
                  )}
                  <form action={savePhoto} className="flex flex-col gap-4">
                    <input type="hidden" name="slug" value={mandir.slug} />
                    <p className="text-muted">
                      A photo of the mandir building, outside or inside. People
                      see it at the top of your page and when your page is
                      shared.
                    </p>
                    <PhotoPicker />
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="agree"
                        value="yes"
                        required
                        className="accent-peacock mt-1 size-6 shrink-0"
                      />
                      <span>
                        It&apos;s a photo of the building with no people in it,
                        and we&apos;re happy for Toran to show it.
                      </span>
                    </label>
                    <button type="submit" className={buttonClass}>
                      {mandir.photo_path
                        ? "Use this photo instead"
                        : "Add the photo"}
                    </button>
                  </form>
                </Sheet>
              </div>
              <div>
                <Sheet
                  id="details"
                  title="Your mandir's details"
                  open={focus === "details"}
                  stamp={stamp}
                  triggerClass={settingClass}
                  trigger={settingRow(
                    "Details",
                    "Postcode, website, opening times, visiting",
                  )}
                >
                  {inSheet("details")}
                  <p className="text-muted">
                    Shown on your public page. To change the mandir&apos;s name
                    or town, ask Toran.
                  </p>
                  <form
                    action={updatePracticalDetails}
                    className="flex flex-col gap-5"
                  >
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
                      <span className="font-semibold">
                        YouTube / Livestream
                      </span>
                      <span className="text-muted -mt-1 text-base">
                        Your YouTube channel, or wherever you stream aarti or
                        katha (Facebook, or your own site). Shown on your page
                        as &ldquo;Watch on YouTube&rdquo; or &ldquo;Watch
                        live&rdquo;.
                      </span>
                      <input
                        name="live_url"
                        inputMode="url"
                        defaultValue={mandir.live_url ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-semibold">
                        Requests families can send
                      </span>
                      <span className="text-muted -mt-1 text-base">
                        Pujas, ceremonies or hall hire families can ask you
                        about through Toran, one per line (up to 8), such as
                        &ldquo;Havan&rdquo;, &ldquo;Naming ceremony&rdquo; or
                        &ldquo;Hall hire&rdquo;. Requests come to your committee
                        by email; Toran doesn&apos;t keep them. Leave empty for
                        none.
                      </span>
                      <textarea
                        name="request_types"
                        rows={3}
                        defaultValue={(mandir.request_types ?? []).join("\n")}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-semibold">Donation page</span>
                      <span className="text-muted -mt-1 text-base">
                        Your own page for giving: JustGiving, PayPal or a page
                        on your own site. Shown on your page as &ldquo;Give to
                        the mandir&rdquo;. Toran only links to it: no money goes
                        through Toran.
                      </span>
                      <input
                        name="donate_url"
                        inputMode="url"
                        defaultValue={mandir.donate_url ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="font-semibold">Mandir phone number</span>
                      <span className="text-muted -mt-1 text-base">
                        The mandir&apos;s own number, not a personal mobile, as
                        it&apos;s shown publicly.
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
                        Parking, which entrance to use, the nearest station or
                        bus. Shown on your page and with every event, next to
                        directions.
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
                    <HoursFields
                      sessions={readSessions(mandir.opening_hours)}
                      aartis={aartis}
                    />
                    <VisitingFields
                      facilities={mandir.facilities}
                      note={mandir.visiting_note}
                    />
                    <button type="submit" className={buttonClass}>
                      Save details
                    </button>
                  </form>
                </Sheet>
              </div>
              <div>
                <Sheet
                  id="calendar"
                  title="Your events calendar"
                  open={focus === "calendar"}
                  stamp={stamp}
                  triggerClass={settingClass}
                  trigger={settingRow(
                    "Your calendar",
                    calendar
                      ? `Reading ${feedLabel(calendar.url)}`
                      : "Google Calendar, Outlook or your website",
                  )}
                >
                  {inSheet("calendar")}
                  <CalendarFields slug={mandir.slug} calendar={calendar} />
                </Sheet>
              </div>
              <a
                href={GUIDE_PATH}
                target="_blank"
                rel="noopener"
                className={`${settingClass} no-underline`}
              >
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="font-semibold">Committee guide</span>
                  <span className="text-muted line-clamp-1 text-base">
                    How everything here works, step by step
                  </span>
                </span>
                <span aria-hidden="true" className="text-muted text-lg">
                  ↗
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              {changes.length > 0 && (
                <div>
                  <Sheet
                    id="changes"
                    title="What's changed lately"
                    stamp={stamp}
                    triggerClass={settingClass}
                    trigger={settingRow(
                      "Recent changes",
                      `${changes.length} in the last two weeks`,
                    )}
                  >
                    <ul className="flex flex-col gap-2">
                      {changes.map((c) => (
                        <li
                          key={`${c.id}-${c.at}`}
                          className="border-line flex flex-wrap items-baseline gap-x-2 rounded-2xl border p-3"
                        >
                          <Badge
                            tone={c.what === "Added" ? "peacock" : "marigold"}
                          >
                            {c.what}
                          </Badge>
                          <span className="font-semibold">{c.title}</span>
                          <span className="text-muted text-base">
                            {c.by ? `${c.by}, ` : ""}
                            {formatEventStart(c.at, true)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Sheet>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// "Connect your website" (decision 0032): connected, how the last read
// went, its two choices and a way to stop; not yet, one address and one
// button. Keys for a web developer's own system are tucked underneath.
function ConnectWebsite({
  slug,
  website,
  connection,
  forwardTo,
  apiKeys,
  apiEvents,
}: {
  slug: string;
  website: string;
  connection: {
    website: string;
    auto_publish: boolean;
    read_posters: boolean;
    last_checked_at: string | null;
    last_outcome: string | null;
    last_found: number | null;
    last_published: number | null;
    last_queued: number | null;
    last_posters: number | null;
    help_asked_at: string | null;
  } | null;
  forwardTo: string | null;
  apiKeys: Parameters<typeof ApiFields>[0]["keys"];
  apiEvents: number;
}) {
  const readingOn = posterReadingOn();
  const developers = (
    <details className="border-line rounded-2xl border p-4">
      <summary className="cursor-pointer font-semibold">
        For web developers: connect your own system with a key
      </summary>
      <div className="mt-4">
        <ApiFields slug={slug} keys={apiKeys} events={apiEvents} />
      </div>
    </details>
  );
  if (!connection) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-muted">
          If your website lists your events or shows your posters, Toran can add
          them for you. Press the button and Toran reads your website now, then
          again every night, so new events appear here without anyone typing
          them.
        </p>
        <WebsiteConnectForm
          slug={slug}
          website={website}
          readingOn={readingOn}
          action={connectWebsite}
          helpAction={askWebsiteHelp}
          forwardTo={forwardTo}
        />
        {developers}
      </div>
    );
  }
  const n = (v: number | null) => v ?? 0;
  const host = (() => {
    try {
      return new URL(connection.website).hostname.replace(/^www\./, "");
    } catch {
      return connection.website;
    }
  })();
  return (
    <div className="flex flex-col gap-5">
      <div
        className="border-leaf bg-leaf/10 flex flex-col gap-1 rounded-2xl border-l-4 p-4"
        data-testid="website-connected"
      >
        <p className="font-semibold break-words">Connected to {host}</p>
        {connection.last_checked_at ? (
          <p className="text-muted">
            Last read {formatEventStart(connection.last_checked_at, false)}:{" "}
            {n(connection.last_found) || n(connection.last_posters)
              ? [
                  `${n(connection.last_found)} ${n(connection.last_found) === 1 ? "event" : "events"} listed`,
                  n(connection.last_published)
                    ? `${n(connection.last_published)} added to your page`
                    : "",
                  n(connection.last_queued)
                    ? `${n(connection.last_queued)} waiting for you`
                    : "",
                  n(connection.last_posters)
                    ? `${n(connection.last_posters)} ${n(connection.last_posters) === 1 ? "poster" : "posters"}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(", ")
              : connection.last_outcome === "blocked"
                ? "your website asks robots not to read it"
                : "no events Toran can read yet"}
            .
          </p>
        ) : (
          <p className="text-muted">Toran reads it tonight.</p>
        )}
      </div>
      {connection.last_checked_at &&
        !n(connection.last_found) &&
        !n(connection.last_posters) &&
        (connection.help_asked_at ? (
          <p>
            You asked Toran to help connect it: Toran&apos;s team will be in
            touch.
          </p>
        ) : (
          <form action={askWebsiteHelp}>
            <input type="hidden" name="slug" value={slug} />
            <p className="mb-3">
              Toran can&apos;t read events from your website by itself yet.
              {forwardTo
                ? ` You can forward posters to ${forwardTo}, or`
                : ""}{" "}
              ask Toran&apos;s team to help connect it.
            </p>
            <button type="submit" className={buttonClass}>
              Ask Toran to help
            </button>
          </form>
        ))}
      <form action={saveWebsiteSettings} className="flex flex-col gap-4">
        <input type="hidden" name="slug" value={slug} />
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="auto_publish"
            defaultChecked={connection.auto_publish}
            className="mt-1 size-6 shrink-0"
          />
          <span>
            Put the events your website lists on Toran straight away
            <span className="text-muted block text-base">
              Untick to check each one first.
            </span>
          </span>
        </label>
        {readingOn && (
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="read_posters"
              defaultChecked={connection.read_posters}
              className="mt-1 size-6 shrink-0"
            />
            <span>
              Read the posters and patrikas on it too
              <span className="text-muted block text-base">
                Toran&apos;s AI reads them; you check what it finds.
              </span>
            </span>
          </label>
        )}
        <button type="submit" className={quietButtonClass}>
          Save
        </button>
      </form>
      <WebsiteConnectForm
        slug={slug}
        website={connection.website}
        autoPublish={connection.auto_publish}
        readPosters={connection.read_posters}
        readingOn={readingOn}
        action={connectWebsite}
        helpAction={askWebsiteHelp}
        forwardTo={forwardTo}
        again
      />
      <form action={disconnectWebsite}>
        <input type="hidden" name="slug" value={slug} />
        <button
          type="submit"
          className="text-muted min-h-11 cursor-pointer font-semibold underline"
        >
          Stop reading my website
        </button>
      </form>
      {developers}
    </div>
  );
}

// "Connect your own system": keys for the mandir's own website or booking
// software to put events on Toran by itself (decision 0032), with the page
// that tells its developer how.
function ApiFields({
  slug,
  keys,
  events,
}: {
  slug: string;
  keys: {
    id: string;
    label: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
  }[];
  events: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted">
        If your mandir&apos;s website or booking software already lists your
        events, it can put them on Toran by itself, and change or cancel them
        when you do there. Make a key, then send it with{" "}
        <Link
          href={EVENTS_API_PATH}
          target="_blank"
          rel="noopener"
          className="text-peacock font-semibold underline"
        >
          the instructions for your web developer
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
        . Its events are published straight away as confirmed by your mandir.
      </p>
      {events > 0 && (
        <p>
          {events === 1
            ? "1 event on your page came from your system."
            : `${events} events on your page came from your system.`}
        </p>
      )}
      {keys.length > 0 && (
        <ul className="flex flex-col gap-3" aria-label="Working keys">
          {keys.map((k) => (
            <li
              key={k.id}
              className="border-line flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold break-words">{k.label}</span>
                <span className="text-muted text-base">
                  <span className="font-mono">{k.prefix}…</span>, made{" "}
                  {formatEventStart(k.created_at, true)}
                  {k.last_used_at
                    ? `, last used ${formatEventStart(k.last_used_at, true)}`
                    : ", not used yet"}
                </span>
              </span>
              <form action={revokeApiKey}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="key" value={k.id} />
                <button type="submit" className={quietButtonClass}>
                  Stop this key
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ApiKeyMaker slug={slug} action={createApiKey} />
    </div>
  );
}

const menuRowClass =
  "border-line hover:bg-sunk text-ink flex w-full cursor-pointer items-center rounded-2xl border px-4 py-3 text-left font-semibold no-underline transition active:scale-[0.99]";

// "Your events calendar": the address of the calendar the mandir already
// keeps, which Toran reads every night (lib/nightly.ts). Its address is
// never shown in full: Google's secret address works like a password.
function CalendarFields({
  slug,
  calendar,
}: {
  slug: string;
  calendar: {
    url: string;
    last_read_at: string | null;
    last_outcome: string | null;
    last_found: number | null;
    last_added: number | null;
  } | null;
}) {
  const status = !calendar
    ? null
    : !calendar.last_read_at
      ? "Not read yet: Toran reads it tonight."
      : calendar.last_outcome === "unreachable"
        ? "Toran couldn't read it last time. Check the address still works, or paste it again."
        : `Last read ${formatEventStart(calendar.last_read_at, true)}: ${calendar.last_found ?? 0} coming up, ${calendar.last_added ?? 0} new for you to check.`;
  return (
    <>
      <p>
        Already keep your events in Google Calendar, Outlook or your
        website&apos;s calendar? Give Toran its address and it&apos;s checked
        every night. New events wait above with the posters for you to check, so
        nothing goes on your page until you publish it.
      </p>
      {calendar && (
        <div className="bg-sunk flex flex-col gap-2 rounded-2xl p-4">
          <p className="font-semibold">Reading: {feedLabel(calendar.url)}</p>
          {status && <p className="text-muted">{status}</p>}
          <form action={removeCalendar}>
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className={pillButtonClass}>
              Stop reading it
            </button>
          </form>
        </div>
      )}
      <form action={saveCalendar} className="flex flex-col gap-3">
        <input type="hidden" name="slug" value={slug} />
        <label className="flex flex-col gap-2">
          <span className="font-semibold">
            {calendar ? "A different calendar address" : "Calendar address"}
          </span>
          <input
            name="calendar_url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            className={inputClass}
          />
        </label>
        <details className="text-base">
          <summary className="text-peacock cursor-pointer py-2.5 font-semibold">
            Where do I find it?
          </summary>
          <ul className="text-muted mt-2 flex list-disc flex-col gap-2 pl-6">
            <li>
              <strong>Google Calendar</strong>, on a computer: Settings (the
              cog), then your mandir&apos;s calendar on the left, then
              &ldquo;Integrate calendar&rdquo;. Copy &ldquo;Public address in
              iCal format&rdquo;, or &ldquo;Secret address in iCal format&rdquo;
              if the calendar isn&apos;t public. Toran keeps it private.
            </li>
            <li>
              <strong>Outlook</strong>: Settings, Calendar, Shared calendars,
              Publish a calendar. Copy the ICS link.
            </li>
            <li>
              <strong>Your website</strong>: look for &ldquo;Subscribe&rdquo;,
              &ldquo;iCal&rdquo; or &ldquo;Export&rdquo; on its events page.
            </li>
          </ul>
        </details>
        <button type="submit" className={buttonClass}>
          Save calendar
        </button>
      </form>
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
    <button type="submit" name="intent" value={intent} className={menuRowClass}>
      {children}
    </button>
  );
}
