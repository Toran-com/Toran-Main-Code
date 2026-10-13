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
  quietButtonClass,
} from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { upcomingFilter, withNextStart } from "@/lib/events";
import { formatEventStart, londonDate } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { ConfirmButton } from "@/components/confirm-button";
import { EventFields } from "@/components/event-fields";
import { FORM_ERRORS } from "@/lib/mandir-form";
import { EVENT_ERRORS } from "@/lib/event-form";
import { posterFrom } from "@/lib/posters";
import { PosterDetails } from "@/components/poster-details";
import {
  addEvent,
  changeEvent,
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
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  added: "Added. It's on your public page now.",
  confirm: "Thanks, marked as confirmed today.",
  cancel: "Marked as cancelled. Visitors will see that it's off.",
  restore: "Back on. Visitors will see it as happening.",
  remove: "Removed from your page.",
  details: "Saved. Your public page shows the new details.",
  published: "Published. It's on your public page now.",
  discarded: "Thanks. That poster won't be published.",
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
        .select("id, slug, name, town, postcode, website, phone")
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
      "id, title, summary, starts_at, all_day, status, confirmed_at, recurrence, event_occurrences (starts_at, cancelled)",
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

  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];
  const done =
    query.added === "1" ? DONE.added : DONE[String(query.done ?? "")];

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold">
          {mandir.name}, {mandir.town}
        </p>
        <Link
          href={`/mandirs/${mandir.slug}`}
          className="text-peacock font-semibold underline"
        >
          See your public page
        </Link>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">{done}</Notice>}

      {posters.length > 0 && (
        <Card>
          <h2 className="text-2xl font-bold">Posters waiting for you</h2>
          <p className="text-muted">
            Someone sent Toran {posters.length === 1 ? "this" : "these"} for
            your mandir. If the details are right, publish; if not, choose
            &ldquo;Not right&rdquo; and add the event yourself.
          </p>
          <ul className="flex flex-col gap-3">
            {posters.map(({ id, poster }) => (
              <li
                key={id}
                className="border-line flex flex-col gap-3 rounded-2xl border p-4"
              >
                <PosterDetails poster={poster} />
                <form
                  action={reviewPosterAsCommittee}
                  className="flex flex-wrap gap-2"
                >
                  <input type="hidden" name="slug" value={mandir.slug} />
                  <input type="hidden" name="poster" value={id} />
                  <button
                    type="submit"
                    name="decision"
                    value="publish"
                    className={buttonClass}
                  >
                    Publish
                  </button>
                  <button
                    type="submit"
                    name="decision"
                    value="discard"
                    className={quietButtonClass}
                  >
                    Not right
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-2xl font-bold">Add an event</h2>
        <form action={addEvent} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <EventFields />
          <button type="submit" className={buttonClass}>
            Add event
          </button>
        </form>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-2xl font-bold">
          Coming up
        </h2>
        {events?.length ? (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="border-line bg-surface flex flex-col gap-3 rounded-2xl border p-5"
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
                  <p className="text-xl font-bold">{event.title}</p>
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
                  {event.status !== "cancelled" && (
                    <Link
                      href={`/manage/${mandir.slug}/seva/${event.id}`}
                      className={`${quietButtonClass} px-4 py-2 text-base`}
                    >
                      Seva rota
                    </Link>
                  )}
                  <ConfirmButton
                    name="intent"
                    value="remove"
                    question={`Remove "${event.title}" from your page?`}
                    className={`${quietButtonClass} px-4 py-2 text-base`}
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

      <Card>
        <h2 className="text-2xl font-bold">Your mandir&apos;s details</h2>
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
      className={`${quietButtonClass} px-4 py-2 text-base`}
    >
      {children}
    </button>
  );
}
