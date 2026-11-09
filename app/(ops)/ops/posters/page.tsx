import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventFields } from "@/components/event-fields";
import { PosterPicture } from "@/components/poster-picture";
import { Badge } from "@/components/public-shell";
import { ReviewItem } from "@/components/review-item";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { OpsPage } from "@/components/ops-page";
import { requireToranAdmin } from "@/lib/auth";
import { formatDateRange } from "@/lib/format";
import { londonDate } from "@/lib/london";
import { daysBetween } from "@/lib/quick-events";
import { DUPLICATE_ERRORS, MERGED } from "@/lib/duplicates";
import { EVENT_ERRORS } from "@/lib/event-form";
import { pageTitle } from "@/lib/site";
import { MAX_MESSAGE_CHARS, posterReadingOn } from "@/lib/poster-reader";
import { bySoonest, hasPassed } from "@/lib/queue-dates";
import { checkLink, POSTER_SOURCES, posterFrom } from "@/lib/posters";
import {
  eventCandidates,
  SOURCE_GROUPS,
  type SourceGroup,
  sourceGroup,
  withDuplicates,
} from "@/lib/review-queue";
import { createSessionClient } from "@/lib/supabase/session";
import {
  IMPORT_COLUMNS,
  IMPORT_PROBLEMS,
  type ImportProblem,
} from "@/lib/website-import";
import {
  addPoster,
  discardPast,
  importWebsiteEvents,
  publishTicked,
  readMessageAsToran,
  readPosterPicture,
  reviewPosterAsToran,
} from "./actions";

// Toran's review queue. At the top, the ways to add events (a photo of a
// poster, a pasted message, typing one in, rows from a spreadsheet), each
// opening its form in the same place, one at a time (?add=...). Below,
// everything waiting before it goes on the site, whichever way it arrived
// (a poster Toran typed up, a visitor's "Tell us", the website checker),
// soonest first, with look-alikes flagged. Anything whose date has passed
// is set apart, to discard in one go. Toran publishes for mandirs with no
// committee on Toran; for the rest, the committee publishes from its own
// page.

export const metadata: Metadata = {
  title: pageTitle("Review queue · Admin"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...EVENT_ERRORS,
  mandir: "Please choose the mandir.",
  from: "Please say where the poster came from.",
  link: "Please give a full web address starting https://, or leave it empty.",
  claimed:
    "That mandir has a committee, so they publish it. It's waiting on their page.",
  done: "Someone has already dealt with that one.",
  ticked: "Tick at least one event to publish.",
  ...DUPLICATE_ERRORS,
  readingOff: "Reading pictures isn't switched on yet.",
  picture: "Please choose a photo or PDF of the poster.",
  pictureType: "Please send a JPEG, PNG, WebP or GIF photo, or a PDF.",
  pictureSize:
    "That file is over 4 MB. Try a smaller photo, or one page of the PDF.",
  pictureRefused:
    "Claude declined to read that picture. Please type it up instead.",
  pictureFailed:
    "The poster couldn't be read just now. Please try again, or type it up.",
  message: "Please paste the message first.",
  messageLong:
    "That message is too long. Paste just the part about the events.",
  messageRefused:
    "Claude declined to read that message. Please type it up instead.",
  failed: "Something went wrong. Please try again.",
};

// The ways to add events, in the order they're offered.
const WAYS = {
  photo: {
    title: "Photo of a poster",
    body: "Claude reads the events off it.",
    icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    reading: true,
  },
  message: {
    title: "Paste a message",
    body: "A WhatsApp forward or an email.",
    icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
    reading: true,
  },
  type: {
    title: "Type it in",
    body: "One event by hand.",
    icon: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
    reading: false,
  },
  rows: {
    title: "Paste spreadsheet rows",
    body: "Many events from mandirs' websites.",
    icon: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
    reading: false,
  },
} as const;
type Way = keyof typeof WAYS;

const DONE: Record<string, string> = {
  merged: MERGED,
  published: "Published. It's on the mandir's page now.",
  discarded: "Discarded.",
  corrected: "Saved. The committee sees your corrected details.",
};

const GROUPS = Object.keys(SOURCE_GROUPS) as SourceGroup[];

export default function OpsPostersPage(props: PageProps<"/ops/posters">) {
  return (
    <OpsPage
      title="Review queue"
      intro="Add events, then check them before they go live."
    >
      <Suspense fallback={<Loading />}>
        <Queue {...props} />
      </Suspense>
    </OpsPage>
  );
}

async function Queue({ searchParams }: PageProps<"/ops/posters">) {
  await requireToranAdmin("/ops/posters");
  const supabase = await createSessionClient();
  const [{ data: mandirs }, { data: claims }] = supabase
    ? await Promise.all([
        supabase
          .from("mandirs")
          .select("slug, name, town")
          .neq("status", "hidden")
          .order("name"),
        supabase
          .from("event_claims")
          .select(
            "id, proposed, created_at, mandir:mandirs (id, slug, name, town, status)",
          )
          .eq("status", "pending")
          .order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];
  const query = await searchParams;
  const error =
    query.published === "0"
      ? "None of the ticked ones could be published: someone else dealt with them, or they need a closer look."
      : ERRORS[String(query.error ?? "")];
  const read =
    query.read === undefined
      ? null
      : { added: Number(query.read) || 0, skipped: Number(query.skipped) || 0 };
  const cleared =
    query.cleared === undefined ? null : Number(query.cleared) || 0;
  const done = query.added
    ? "Added to the queue. Add another below, or check it in the list."
    : cleared !== null
      ? cleared
        ? `Discarded ${cleared} ${cleared === 1 ? "event" : "events"} whose date had passed.`
        : "Nothing to discard: none of them have passed."
      : read
        ? readMessage(read, query["from-message"] === "1")
        : query.published !== undefined && query.published !== "0"
          ? tickedMessage(Number(query.published) || 0, Number(query.left) || 0)
          : DONE[String(query.done ?? "")];
  const chosen = String(query.mandir ?? "");
  const reading = posterReadingOn();
  const ways = (Object.keys(WAYS) as Way[]).filter(
    (w) => reading || !WAYS[w].reading,
  );
  const adding = ways.find((w) => w === query.add);
  // Coming from a patrika found on a mandir's website (/ops/websites).
  const startLink = String(query.link ?? "");
  const prefill = {
    link: startLink && checkLink(startLink) ? startLink : "",
    from:
      query.source === "website" ? ("website" as const) : ("whatsapp" as const),
  };
  const group = GROUPS.find((g) => g === query.from);
  const fixing = String(query.fix ?? "");
  const here = group ? `/ops/posters?from=${group}` : "/ops/posters";
  const imported =
    query.imported === undefined
      ? null
      : {
          added: Number(query.imported) || 0,
          skipped: Number(query.skipped) || 0,
          problems: String(query.problems ?? "")
            .split(",")
            .flatMap((p) => {
              const [line, problem] = p.split(":");
              return problem && problem in IMPORT_PROBLEMS
                ? [
                    `Line ${line}: ${IMPORT_PROBLEMS[problem as ImportProblem["problem"]]}.`,
                  ]
                : [];
            }),
        };

  // Everything waiting, oldest first, with look-alikes flagged.
  const queue = (claims ?? []).flatMap((c) => {
    const poster = posterFrom(c.proposed);
    return poster && c.mandir
      ? [{ ...c, mandir: c.mandir, mandirId: c.mandir.id, poster }]
      : [];
  });
  const events = supabase
    ? await eventCandidates(supabase, [
        ...new Set(queue.map((c) => c.mandirId)),
      ])
    : new Map();
  const all = withDuplicates(queue, events).map((c) => ({
    ...c,
    group: sourceGroup(c.poster.from),
  }));
  const today = londonDate();
  const shown = (group ? all.filter((c) => c.group === group) : all).sort(
    (a, b) => bySoonest(a.poster, b.poster),
  );
  // Past its date: can't go on the site any more (the nightly job clears
  // these too).
  const past = shown.filter((c) => hasPassed(c.poster, today));
  const waiting = shown.filter((c) => !hasPassed(c.poster, today));
  // Toran can publish these straight away, nothing like them is listed or
  // waiting, so several can go together.
  const tickable = (c: (typeof waiting)[number]) =>
    c.mandir.status !== "claimed" && c.duplicates.length === 0;
  const canTick = waiting.filter(tickable).length > 1 && fixing === "";
  const mandirOptions = (mandirs ?? []).map((m) => (
    <option key={m.slug} value={m.slug}>
      {m.name}, {m.town}
    </option>
  ));
  const sources = Object.entries(POSTER_SOURCES)
    .filter(([key]) => key !== "visitor")
    .map(([value, { label }]) => ({ value, label }));

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <section
        id="add"
        aria-labelledby="add-heading"
        className="border-line bg-surface shadow-card flex scroll-mt-24 flex-col gap-5 rounded-3xl border p-5 sm:p-6"
      >
        <h2 id="add-heading" className="text-2xl font-bold">
          Add events
        </h2>
        <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {ways.map((way) => {
            const current = way === adding;
            return (
              <li key={way}>
                <Link
                  href={
                    current
                      ? "/ops/posters#add"
                      : `/ops/posters?add=${way}${chosen ? `&mandir=${encodeURIComponent(chosen)}` : ""}#add`
                  }
                  aria-current={current ? "true" : undefined}
                  scroll={false}
                  className={`flex h-full flex-col gap-2 rounded-2xl border-2 p-4 no-underline transition duration-200 active:scale-[0.98] ${
                    current
                      ? "border-peacock bg-peacock/10"
                      : "border-line hover:border-peacock/50 bg-surface"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="bg-peacock/10 text-peacock grid size-11 place-items-center rounded-2xl"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={WAYS[way].icon} />
                    </svg>
                  </span>
                  <span className="text-ink text-lg leading-snug font-bold">
                    {WAYS[way].title}
                  </span>
                  <span className="text-muted hidden text-base leading-snug sm:block">
                    {WAYS[way].body}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!reading && (
          <p className="text-muted">
            Reading posters and messages isn&apos;t switched on yet: it needs an
            Anthropic API key (ANTHROPIC_API_KEY) in Vercel&apos;s settings.
          </p>
        )}

        {adding === "photo" && (
          <div className="border-line flex flex-col gap-4 border-t pt-5">
            <p className="text-muted">
              A photo or PDF of a poster or patrika. Claude reads the events off
              it and each one waits below to be checked, marked &ldquo;read by
              machine&rdquo;. The picture isn&apos;t kept.
            </p>
            <PosterPicture
              action={readPosterPicture}
              mandirs={mandirs ?? []}
              chosen={chosen}
              sources={sources}
            />
          </div>
        )}

        {adding === "message" && (
          <form
            action={readMessageAsToran}
            aria-label="Paste a message"
            className="border-line flex flex-col gap-5 border-t pt-5"
          >
            <p className="text-muted">
              Paste a message someone sent about a mandir&apos;s events. Claude
              reads the events out of it and each one waits below to be checked.
              Only the events are kept: never the name or number of whoever sent
              it.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Mandir</span>
                <select
                  name="mandir"
                  required
                  defaultValue={chosen}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Choose a mandir
                  </option>
                  {mandirOptions}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Where it came from</span>
                <select
                  name="from"
                  required
                  defaultValue="whatsapp"
                  className={inputClass}
                >
                  {sources.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">The message</span>
              <textarea
                name="message"
                required
                rows={8}
                maxLength={MAX_MESSAGE_CHARS}
                className={inputClass}
              />
            </label>
            <button type="submit" className={`${buttonClass} self-start`}>
              Read the message
            </button>
          </form>
        )}

        {adding === "type" && (
          <form
            action={addPoster}
            aria-label="Type it in"
            className="border-line flex flex-col gap-5 border-t pt-5"
          >
            <p className="text-muted">
              Copy the event from a poster or message. Only the event: never the
              name or number of whoever sent it. After adding, the form stays
              open with the same mandir for the next one.
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Mandir</span>
                <select
                  name="mandir"
                  required
                  defaultValue={chosen}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Choose a mandir
                  </option>
                  {mandirOptions}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Where it came from</span>
                <select
                  name="from"
                  required
                  defaultValue={prefill.from}
                  className={inputClass}
                >
                  {sources.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <EventFields gujarati />
            <label className="flex flex-col gap-2">
              <span className="font-semibold">
                Link for more details (optional)
              </span>
              <input
                name="link"
                type="url"
                maxLength={300}
                placeholder="https://"
                defaultValue={prefill.link}
                className={inputClass}
              />
            </label>
            <button type="submit" className={`${buttonClass} self-start`}>
              Add to the queue
            </button>
          </form>
        )}

        {adding === "rows" && (
          <div className="border-line flex flex-col gap-4 border-t pt-5">
            <p className="text-muted">
              For events read from a mandir&apos;s own website, such as its
              Diwali programme page. Copy rows from a spreadsheet with these
              columns, in this order (a header row is fine):{" "}
              <code>{IMPORT_COLUMNS.join(", ")}</code>. The mandir is its page
              address on Toran, the date is YYYY-MM-DD, the time is HH:MM or
              empty for all day, and the link is the page it was read from.
              Kind, description and Gujarati name are optional. Anything already
              there is skipped, so the same rows can be sent again.
            </p>
            {imported && (
              <Notice tone="success">
                Added {imported.added} to the queue
                {imported.skipped
                  ? `; ${imported.skipped} ${imported.skipped === 1 ? "was" : "were"} already there`
                  : ""}
                .
              </Notice>
            )}
            {imported && imported.problems.length > 0 && (
              <Notice tone="error">
                These rows weren&apos;t added:
                <ul className="mt-2 list-disc pl-6">
                  {imported.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </Notice>
            )}
            <form action={importWebsiteEvents} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Rows</span>
                <textarea
                  name="rows"
                  required
                  rows={8}
                  spellCheck={false}
                  placeholder={
                    "shree-ram-mandir-leicester\t2026-11-08\t18:30\tDiwali Lakshmi puja\thttps://example.org/diwali"
                  }
                  className={`${inputClass} font-mono`}
                />
              </label>
              <button type="submit" className={`${buttonClass} self-start`}>
                Add them to the queue
              </button>
            </form>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section
          aria-labelledby="past"
          className="border-marigold bg-marigold/10 flex flex-col gap-3 rounded-3xl border-2 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex basis-80 flex-col gap-1">
              <h2 id="past" className="text-xl font-bold">
                Date has passed ({past.length})
              </h2>
              <p>
                {past.length === 1 ? "This one" : "These"} can&apos;t go on the
                site any more. They&apos;re cleared each night, or clear them
                now.
              </p>
            </div>
            <form action={discardPast}>
              {group && <input type="hidden" name="group" value={group} />}
              {past.map((c) => (
                <input key={c.id} type="hidden" name="poster" value={c.id} />
              ))}
              <button type="submit" className={buttonClass}>
                Discard {past.length === 1 ? "it" : `all ${past.length}`}
              </button>
            </form>
          </div>
          <details>
            <summary className="cursor-pointer font-semibold">
              See {past.length === 1 ? "it" : "them"}
            </summary>
            <ul className="divide-line mt-3 flex flex-col divide-y">
              {past.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2"
                >
                  <span className="font-semibold">{c.poster.title}</span>
                  <span className="text-muted">
                    {c.mandir.name} ·{" "}
                    {c.poster.date
                      ? formatDateRange(c.poster.date, c.poster.date)
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      <section aria-labelledby="waiting" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="waiting" className="text-2xl font-bold">
            Waiting to be checked ({waiting.length})
          </h2>
          <nav aria-label="Where it came from">
            <ul className="flex flex-wrap gap-2">
              {[undefined, ...GROUPS].map((g) => {
                const count = (
                  g ? all.filter((c) => c.group === g) : all
                ).filter((c) => !hasPassed(c.poster, today)).length;
                const current = g === group;
                return (
                  <li key={g ?? "all"}>
                    <Link
                      href={g ? `/ops/posters?from=${g}` : "/ops/posters"}
                      aria-current={current ? "page" : undefined}
                      className={`inline-block rounded-full border px-4 py-1.5 text-base font-semibold ${
                        current
                          ? "border-peacock bg-peacock text-on-peacock"
                          : "border-line hover:bg-sunk"
                      }`}
                    >
                      {g ? SOURCE_GROUPS[g] : "All"} ({count})
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        {waiting.length === 0 && (
          <p className="text-muted">
            Nothing waiting. Add events above, and they&apos;ll wait here to be
            checked.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {waiting.map((c) => {
            const hasCommittee = c.mandir.status === "claimed";
            // Calendar days in London, so yesterday evening is "1 day".
            const days = daysBetween(londonDate(new Date(c.created_at)), today);
            return (
              <ReviewItem
                key={c.id}
                id={c.id}
                mandirSlug={c.mandir.slug}
                poster={c.poster}
                duplicates={c.duplicates}
                action={reviewPosterAsToran}
                hidden={group ? { group } : {}}
                canPublish={!hasCommittee}
                fixing={fixing === c.id}
                tickForm={canTick && tickable(c) ? "publish-ticked" : undefined}
                fixHref={`${here}${group ? "&" : "?"}fix=${c.id}#item-${c.id}`}
                cancelHref={`${here}#item-${c.id}`}
                header={
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Not prefetched: fetching the public page in the
                        background while it's being published here could
                        keep the version from before. */}
                    <Link
                      href={`/mandirs/${c.mandir.slug}`}
                      prefetch={false}
                      className="text-peacock font-semibold underline"
                    >
                      {c.mandir.name}, {c.mandir.town}
                    </Link>
                    {hasCommittee ? (
                      <Badge tone="peacock">Waiting for the committee</Badge>
                    ) : (
                      <Badge tone="marigold">No committee yet</Badge>
                    )}
                    <span className="text-muted text-base">
                      {days === 0
                        ? "Came in today"
                        : `Waiting ${days} ${days === 1 ? "day" : "days"}`}
                    </span>
                  </div>
                }
              />
            );
          })}
        </ul>
        {canTick && (
          <form
            id="publish-ticked"
            action={publishTicked}
            className="border-line bg-sunk flex flex-wrap items-center gap-4 rounded-2xl border p-5"
          >
            {group && <input type="hidden" name="group" value={group} />}
            <p className="grow basis-64">
              Checked a few? Tick them above and publish them together. Ones
              that look like something already there are left to do on their
              own.
            </p>
            <button type="submit" className={buttonClass}>
              Publish the ticked ones
            </button>
          </form>
        )}
      </section>
    </>
  );
}

function tickedMessage(published: number, left: number) {
  const events = (n: number) => `${n} ${n === 1 ? "event" : "events"}`;
  const stayed = left
    ? ` ${events(left)} stayed in the queue: someone else dealt with ${left === 1 ? "it" : "them"}, or ${left === 1 ? "it needs" : "they need"} a closer look.`
    : "";
  return `Published ${events(published)}. ${published === 1 ? "It's" : "They're"} on the mandirs' pages now.${stayed}`;
}

function readMessage(
  { added, skipped }: { added: number; skipped: number },
  fromMessage: boolean,
) {
  const what = fromMessage ? "the message" : "the poster";
  const events = (n: number) => `${n} ${n === 1 ? "event" : "events"}`;
  const left = skipped
    ? ` ${events(skipped)} left out: already listed or waiting, or not readable.`
    : "";
  return added
    ? `Read ${events(added)} from ${what}. They're waiting below, marked "read by machine": check each one.${left}`
    : `No new events found in ${what}.${left}`;
}
