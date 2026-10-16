import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AddToCalendar } from "@/components/add-to-calendar";
import { JsonLd } from "@/components/json-ld";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { Notice, Ornament } from "@/components/ui";
import {
  getMandir,
  getMandirEvent,
  listMandirs,
  type MandirEventPage,
} from "@/lib/directory";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatEventStart, formatEventWhen } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { eventPath, eventShareText } from "@/lib/share";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData, eventData } from "@/lib/structured-data";

// Every event has its own page: the link people share, with the details,
// directions and calendar buttons in one place. Fully static; an event
// added after the build is rendered on its first visit.
export const ensureStatic = "navigation";

// A build without a database still needs one path to check the page
// against; it shows "not found".
const NO_EVENTS = { slug: "no-mandirs-yet", id: "no-events-yet" };

export async function generateStaticParams() {
  const mandirs = await listMandirs();
  if (mandirs.state !== "ok") return [NO_EVENTS];
  const pages = await Promise.all(
    mandirs.data.map(async ({ slug }) => {
      const result = await getMandir(slug);
      return result.state === "ok" && result.data
        ? result.data.events.map((e) => ({ slug, id: e.id }))
        : [];
    }),
  );
  const params = pages.flat();
  return params.length ? params : [NO_EVENTS];
}

function describe({ mandir, event }: MandirEventPage): string {
  const rule = event.recurrence && describeRule(event.recurrence);
  const when = event.recurrence
    ? `${rule ?? "Repeats"}, next ${formatEventStart(event.next_starts_at, event.all_day)}`
    : formatEventWhen(event.starts_at, event.ends_at, event.all_day);
  return [`${when} at ${mandir.name}, ${mandir.town}.`, event.summary]
    .filter(Boolean)
    .join(" ");
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]/events/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const result = await getMandirEvent(slug, id);
  if (result.state !== "ok" || !result.data) return { title: pageTitle() };
  const page = result.data;
  const metadata = pageMetadata(
    `${page.event.title}, ${page.mandir.name}`,
    describe(page),
    eventPath(slug, id),
  );
  // A finished event stays reachable from old links but isn't offered to
  // search engines.
  return page.upcoming
    ? metadata
    : { ...metadata, robots: { index: false, follow: true } };
}

export default async function EventPage({
  params,
}: PageProps<"/mandirs/[slug]/events/[id]">) {
  const { slug, id } = await params;
  const [result, others] = await Promise.all([
    getMandirEvent(slug, id),
    getMandir(slug),
  ]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what="event" />;
  }
  if (!result.data) notFound();
  const { mandir, event, upcoming } = result.data;
  const cancelled = event.status === "cancelled";
  const rule = event.recurrence && describeRule(event.recurrence);
  const mandirPath = `/mandirs/${mandir.slug}`;
  const path = eventPath(mandir.slug, event.id);
  const alsoOn =
    others.state === "ok" && others.data
      ? others.data.events.filter((e) => e.id !== event.id).slice(0, 3)
      : [];

  return (
    <>
      {upcoming && (
        <JsonLd data={eventData(event, mandir, `${siteUrl()}${path}`)} />
      )}
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: "Mandirs", url: `${siteUrl()}/mandirs` },
          { name: mandir.name, url: `${siteUrl()}${mandirPath}` },
          { name: event.title, url: `${siteUrl()}${path}` },
        ])}
      />
      <Link
        href={mandirPath}
        className="text-peacock self-start font-semibold hover:underline"
      >
        ← {mandir.name}
      </Link>

      <div className="rise flex flex-col gap-3">
        <p className="text-marigold-ink text-xl font-semibold">
          {event.recurrence && `${rule ?? "Repeats"} · next `}
          {formatEventStart(event.next_starts_at, event.all_day)}
        </p>
        <h1
          className={`font-display text-4xl font-extrabold tracking-tight sm:text-5xl ${cancelled ? "line-through" : ""}`}
        >
          {event.title}
        </h1>
        {event.title_gu && (
          <p lang="gu" className="text-2xl font-semibold">
            {event.title_gu}
          </p>
        )}
        <Ornament />
        {(cancelled || !upcoming || kindLabel(event.kind)) && (
          <p className="flex flex-wrap gap-2">
            {cancelled && <Badge tone="kumkum">Cancelled</Badge>}
            {!upcoming && <Badge>Finished</Badge>}
            {kindLabel(event.kind) && <Badge>{kindLabel(event.kind)}</Badge>}
          </p>
        )}
        {upcoming && !cancelled && (
          <div className="flex flex-col gap-3">
            <ShareButtons
              label="Share this event"
              text={eventShareText(event, mandir)}
              path={path}
            />
            <AddToCalendar
              mandirSlug={mandir.slug}
              eventId={event.id}
              title={event.title}
            />
          </div>
        )}
      </div>

      {!upcoming && (
        <Notice>
          This event has finished.{" "}
          <Link href={mandirPath} className="underline">
            See what&apos;s on at {mandir.name}
          </Link>
          .
        </Notice>
      )}
      {cancelled && upcoming && (
        <Notice>
          The mandir has cancelled this event.{" "}
          <Link href={mandirPath} className="underline">
            See what else is on at {mandir.name}
          </Link>
          .
        </Notice>
      )}

      <Details page={result.data} />

      {(event.summary || event.summary_gu) && (
        <section aria-labelledby="about" className="flex flex-col gap-2">
          <h2 id="about" className="font-display text-2xl font-bold">
            About this event
          </h2>
          {event.summary && <p>{event.summary}</p>}
          {event.summary_gu && <p lang="gu">{event.summary_gu}</p>}
        </section>
      )}

      <p className="text-muted text-base">
        {event.confirmed_at
          ? `Confirmed by the mandir, ${new Intl.DateTimeFormat("en-GB", {
              timeZone: "Europe/London",
              day: "numeric",
              month: "short",
            }).format(new Date(event.confirmed_at))}`
          : sourceLabel(event)}
      </p>

      {alsoOn.length > 0 && (
        <section aria-labelledby="also-on" className="flex flex-col gap-3">
          <h2 id="also-on" className="font-display text-2xl font-bold">
            Also at {mandir.name}
          </h2>
          <ul className="rise-list flex flex-col gap-3">
            {alsoOn.map((e) => (
              <li key={e.id}>
                <Link
                  href={eventPath(mandir.slug, e.id)}
                  className="border-line bg-surface lift shadow-card flex flex-col rounded-2xl border p-4 no-underline"
                >
                  <span className="text-marigold-ink font-semibold">
                    {formatEventStart(e.next_starts_at, e.all_day)}
                  </span>
                  <span className="text-lg font-bold">{e.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Link href={mandirPath} className="text-peacock font-semibold">
          Everything at {mandir.name} →
        </Link>
        <Link href="/whats-on" className="text-peacock font-semibold">
          What&apos;s on near you →
        </Link>
      </div>
    </>
  );
}

function Details({ page }: { page: MandirEventPage }) {
  const { mandir, event } = page;
  const rule = event.recurrence && describeRule(event.recurrence);
  const directions = mandir.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${mandir.name} ${mandir.postcode}`,
      )}`
    : null;
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: "When",
      value: event.recurrence ? (
        <>
          {rule ?? "Repeats"}
          <br />
          Next: {formatEventStart(event.next_starts_at, event.all_day)}
        </>
      ) : (
        formatEventWhen(event.starts_at, event.ends_at, event.all_day)
      ),
    },
    {
      label: "Where",
      value: (
        <>
          <Link
            href={`/mandirs/${mandir.slug}`}
            className="text-peacock font-semibold underline"
          >
            {mandir.name}
          </Link>
          , {mandir.town}
          {mandir.postcode && `, ${mandir.postcode}`}
          {event.location_note && (
            <>
              <br />
              {event.location_note}
            </>
          )}
          {directions && (
            <>
              <br />
              <a
                href={directions}
                className="text-peacock font-semibold underline"
              >
                Directions
              </a>
            </>
          )}
        </>
      ),
    },
  ];
  if (event.cost_note) rows.push({ label: "Cost", value: event.cost_note });
  if (event.link) {
    rows.push({
      label: "More details",
      value: (
        <a
          href={event.link}
          rel="noopener"
          className="text-peacock font-semibold break-all underline"
        >
          From the mandir
        </a>
      ),
    });
  }
  return (
    <dl className="border-line bg-surface shadow-card grid gap-x-6 gap-y-3 rounded-2xl border p-5 sm:grid-cols-[auto_1fr]">
      {rows.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-muted text-base sm:text-lg">{label}</dt>
          <dd className="-mt-2 sm:mt-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
