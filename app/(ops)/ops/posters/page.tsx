import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventFields } from "@/components/event-fields";
import { OpsNav } from "@/components/ops-nav";
import { Badge } from "@/components/public-shell";
import { ReviewItem } from "@/components/review-item";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
  PageShell,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { londonDate } from "@/lib/london";
import { daysBetween } from "@/lib/quick-events";
import { DUPLICATE_ERRORS, MERGED } from "@/lib/duplicates";
import { EVENT_ERRORS } from "@/lib/event-form";
import { pageTitle } from "@/lib/site";
import { POSTER_SOURCES, posterFrom } from "@/lib/posters";
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
import { addPoster, importWebsiteEvents, reviewPosterAsToran } from "./actions";

// Toran's review queue: everything waiting before it goes on the site,
// whichever way it arrived (a poster Toran typed up, a visitor's "Tell us",
// the website checker), oldest first, with look-alikes flagged. Toran
// publishes for mandirs with no committee on Toran; for the rest, the
// committee publishes from its own page.

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
  ...DUPLICATE_ERRORS,
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  merged: MERGED,
  published: "Published. It's on the mandir's page now.",
  discarded: "Discarded.",
  corrected: "Saved. The committee sees your corrected details.",
};

const GROUPS = Object.keys(SOURCE_GROUPS) as SourceGroup[];

export default function OpsPostersPage(props: PageProps<"/ops/posters">) {
  return (
    <PageShell title="Review queue" wide>
      <OpsNav current="/ops/posters" />
      <Suspense fallback={<Loading />}>
        <Queue {...props} />
      </Suspense>
    </PageShell>
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
  const error = ERRORS[String(query.error ?? "")];
  const done = query.added
    ? "Added to the queue."
    : DONE[String(query.done ?? "")];
  const chosen = String(query.mandir ?? "");
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
  const waiting = group ? all.filter((c) => c.group === group) : all;
  const today = londonDate();

  return (
    <>
      <p className="text-muted">
        Everything waiting before it goes on the site: posters you typed up,
        events visitors sent in, and events the website checker found. Where a
        mandir has a committee on Toran, the committee publishes; you can still
        correct the details for them, or discard.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      <nav aria-label="Where it came from">
        <ul className="flex flex-wrap gap-2">
          {[undefined, ...GROUPS].map((g) => {
            const count = g
              ? all.filter((c) => c.group === g).length
              : all.length;
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

      <section aria-labelledby="waiting" className="flex flex-col gap-3">
        <h2 id="waiting" className="text-2xl font-bold">
          Waiting ({waiting.length})
        </h2>
        {waiting.length === 0 && <p className="text-muted">Nothing waiting.</p>}
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
                fixHref={`${here}${group ? "&" : "?"}fix=${c.id}#item-${c.id}`}
                cancelHref={`${here}#item-${c.id}`}
                header={
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/mandirs/${c.mandir.slug}`}
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
      </section>

      <Card>
        <h2 className="text-2xl font-bold">Type up a poster</h2>
        <p className="text-muted">
          Copy the event details from a poster or message someone forwarded.
          Only the event: never the name or number of whoever sent it. The
          mandir&apos;s committee then publishes it from their page.
        </p>
        <form action={addPoster} className="flex flex-col gap-5">
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
              {(mandirs ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}, {m.town}
                </option>
              ))}
            </select>
          </label>
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
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Where it came from</span>
            <select
              name="from"
              required
              defaultValue="whatsapp"
              className={inputClass}
            >
              {Object.entries(POSTER_SOURCES)
                .filter(([key]) => key !== "visitor")
                .map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className={buttonClass}>
            Add to the queue
          </button>
        </form>
      </Card>

      <Card>
        <h2 id="import" className="text-2xl font-bold">
          Add several from mandirs&apos; websites
        </h2>
        <p className="text-muted">
          For events read from a mandir&apos;s own website, such as its Diwali
          programme page. Copy rows from a spreadsheet with these columns, in
          this order (a header row is fine):{" "}
          <code>{IMPORT_COLUMNS.join(", ")}</code>. The mandir is its page
          address on Toran, the date is YYYY-MM-DD, the time is HH:MM or empty
          for all day, and the link is the page it was read from. Kind,
          description and Gujarati name are optional. Each joins the queue as
          &ldquo;From the mandir&apos;s website&rdquo;. Anything already there
          is skipped, so the same rows can be sent again.
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
          <button type="submit" className={buttonClass}>
            Add them to the queue
          </button>
        </form>
      </Card>
    </>
  );
}
