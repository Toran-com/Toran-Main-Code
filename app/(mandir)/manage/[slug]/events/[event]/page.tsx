import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventFields } from "@/components/event-fields";
import { buttonClass, Card, Loading, Notice } from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { EVENT_ERRORS, eventInputFromEvent } from "@/lib/event-form";
import { withNextStart } from "@/lib/events";
import { londonDate } from "@/lib/format";
import { requireMandirAccess } from "@/lib/manage-access";
import { pageTitle } from "@/lib/site";
import { editEvent } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Edit event"),
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  ...EVENT_ERRORS,
  duplicate:
    "Another event on your page has that name at that time, so it wasn't changed. If they're the same event, remove one of them.",
  failed: "Something went wrong. Please try again.",
};

export default function EditEventPage(
  props: PageProps<"/manage/[slug]/events/[event]">,
) {
  return (
    <PageShell title="Edit event">
      <Suspense fallback={<Loading />}>
        <EditEvent {...props} />
      </Suspense>
    </PageShell>
  );
}

async function EditEvent({
  params,
  searchParams,
}: PageProps<"/manage/[slug]/events/[event]">) {
  const { slug, event: eventId } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/events/${eventId}`,
  );

  const from = `${londonDate()}T00:00:00Z`;
  const { data: row } = await supabase
    .from("events")
    .select(
      "id, title, summary, title_gu, summary_gu, kind, starts_at, all_day, recurrence, event_occurrences (starts_at, cancelled)",
    )
    .eq("id", eventId)
    .eq("mandir_id", mandir.id)
    .neq("status", "removed")
    .maybeSingle();
  if (!row) notFound();
  // Only upcoming events can be edited; past ones are history.
  const [event] = withNextStart([row], from);
  if (!event) notFound();

  const query = await searchParams;
  const error = ERRORS[String(query.error ?? "")];

  return (
    <>
      <Link
        href={`/manage/${mandir.slug}`}
        className="text-peacock self-start font-semibold"
      >
        ← {mandir.name}
      </Link>
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <form action={editEvent} className="flex flex-col gap-5">
          <input type="hidden" name="slug" value={mandir.slug} />
          <input type="hidden" name="event" value={event.id} />
          <EventFields gujarati kinds values={eventInputFromEvent(event)} />
          {event.recurrence && (
            <p className="text-muted text-base">
              Changes apply from the date above onwards. Earlier dates stay as
              they were.
            </p>
          )}
          <button type="submit" className={buttonClass}>
            Save changes
          </button>
        </form>
      </Card>
    </>
  );
}
