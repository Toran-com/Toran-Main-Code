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
import { formatEventStart, londonDate } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { addEvent, changeEvent } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Manage your mandir"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  title: "Please give the event a name (2 to 120 characters).",
  summary: "Please keep the description under 280 characters.",
  date: "Please choose a date from today onwards, within the next two years.",
  time: "Please choose a valid start time, or leave it empty for all day.",
  failed: "Something went wrong. Please try again.",
};

const DONE: Record<string, string> = {
  added: "Added. It's on your public page now.",
  confirm: "Thanks, marked as confirmed today.",
  cancel: "Marked as cancelled. Visitors will see that it's off.",
  restore: "Back on. Visitors will see it as happening.",
  remove: "Removed from your page.",
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
        .select("id, slug, name, town")
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

  const { data: events } = await supabase!
    .from("events")
    .select("id, title, summary, starts_at, all_day, status, confirmed_at")
    .eq("mandir_id", mandir.id)
    .neq("status", "removed")
    .gte("starts_at", `${londonDate()}T00:00:00Z`)
    .order("starts_at")
    .limit(100);

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

      <Card>
        <h2 className="text-2xl font-bold">Add an event</h2>
        <form action={addEvent} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <label className="flex flex-col gap-2">
            <span className="font-semibold">What&apos;s happening?</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Diwali celebrations"
              className={inputClass}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Date</span>
              <input
                name="date"
                type="date"
                required
                min={londonDate()}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Starts</span>
              <input name="time" type="time" className={inputClass} />
            </label>
          </div>
          <p className="text-muted -mt-3 text-base">
            Leave the start time empty for an all-day event.
          </p>
          <details className="flex flex-col gap-2">
            <summary className="cursor-pointer font-semibold">
              Add a short description (optional)
            </summary>
            <textarea
              name="summary"
              maxLength={280}
              rows={3}
              aria-label="Short description"
              placeholder="e.g. Garba from 8pm, prasad after aarti. All welcome."
              className={`${inputClass} mt-2`}
            />
          </details>
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
                    {formatEventStart(event.starts_at, event.all_day)}
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
                  <EventButton intent="remove">Remove</EventButton>
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
