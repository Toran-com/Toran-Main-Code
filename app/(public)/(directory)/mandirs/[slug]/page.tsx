import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, LoadProblem } from "@/components/public-shell";
import { Card, quietButtonClass } from "@/components/ui";
import {
  getMandir,
  listMandirs,
  type MandirDetails,
  type MandirEvent,
} from "@/lib/directory";
import { formatEventStart, websiteLabel } from "@/lib/format";
import { pageTitle } from "@/lib/site";

// Every mandir page is fully static. A mandir added after the build is
// rendered on its first visit (which waits for it), so an unknown address
// gets a proper 404 rather than a page that streams "not found".
export const ensureStatic = "navigation";

// A build without a database still needs one path to check the page
// against; it shows "not found".
const NO_MANDIRS = "no-mandirs-yet";

export async function generateStaticParams() {
  const result = await listMandirs();
  const slugs = result.state === "ok" ? result.data.map((m) => m.slug) : [];
  return (slugs.length ? slugs : [NO_MANDIRS]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state !== "ok" || !result.data) return { title: pageTitle() };
  const { name, town } = result.data;
  return {
    title: pageTitle(`${name}, ${town}`),
    description: `What's on at ${name} in ${town}: events, festivals and how to find it.`,
  };
}

export default async function MandirPage({
  params,
}: PageProps<"/mandirs/[slug]">) {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what="mandir's page" />;
  }
  if (!result.data) notFound();
  const mandir = result.data;

  return (
    <>
      <Link href="/mandirs" className="text-peacock self-start font-semibold">
        ← All mandirs
      </Link>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {mandir.name}
        </h1>
        <p className="text-muted text-xl">
          {mandir.town}, {mandir.region}
        </p>
        {mandir.status === "claimed" && (
          <p>
            <Badge tone="peacock">Run by the mandir&apos;s committee</Badge>
          </p>
        )}
      </div>

      <Facts mandir={mandir} />

      <section aria-labelledby="whats-on" className="flex flex-col gap-4">
        <h2 id="whats-on" className="font-display text-3xl font-bold">
          What&apos;s on
        </h2>
        {mandir.events.length ? (
          <ul className="flex flex-col gap-3">
            {mandir.events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <NoEvents website={mandir.website} />
        )}
        <Link href="/festivals" className="text-peacock font-semibold">
          Festival dates for the UK →
        </Link>
      </section>

      <Card>
        <h2 className="text-xl font-bold">
          Are you on this mandir&apos;s committee?
        </h2>
        {mandir.status === "claimed" ? (
          <p className="text-muted">
            This page is looked after by the committee.{" "}
            <Link href="/account" className="text-peacock underline">
              Log in
            </Link>{" "}
            to update it, or ask to join them.
          </p>
        ) : (
          <p className="text-muted">
            Look after this page: add events in a minute and correct any
            details.
          </p>
        )}
        <Link
          href={`/mandirs/${mandir.slug}/claim`}
          className={`${quietButtonClass} self-start`}
        >
          Look after this page
        </Link>
      </Card>
    </>
  );
}

function Facts({ mandir }: { mandir: MandirDetails }) {
  const directions = mandir.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${mandir.name} ${mandir.postcode}`,
      )}`
    : null;
  const rows: { label: string; value: ReactNode }[] = [];
  if (mandir.tradition)
    rows.push({ label: "Tradition", value: mandir.tradition });
  if (mandir.postcode && directions) {
    rows.push({
      label: "Postcode",
      value: (
        <>
          {mandir.postcode} ·{" "}
          <a href={directions} className="text-peacock font-semibold underline">
            Directions
          </a>
        </>
      ),
    });
  }
  if (mandir.website) {
    rows.push({
      label: "Website",
      value: (
        <a
          href={mandir.website}
          rel="noopener"
          className="text-peacock font-semibold break-all underline"
        >
          {websiteLabel(mandir.website)}
        </a>
      ),
    });
  }
  if (mandir.phone) {
    rows.push({
      label: "Phone",
      value: (
        <a
          href={`tel:${mandir.phone.replace(/\s/g, "")}`}
          className="underline"
        >
          {mandir.phone}
        </a>
      ),
    });
  }
  if (mandir.charity_number) {
    rows.push({ label: "Registered charity", value: mandir.charity_number });
  }
  if (!rows.length) return null;

  return (
    <dl className="border-line bg-surface grid gap-x-6 gap-y-3 rounded-2xl border p-5 sm:grid-cols-[auto_1fr]">
      {rows.map(({ label, value }) => (
        <div key={label} className="contents">
          <dt className="text-muted text-base sm:text-lg">{label}</dt>
          <dd className="-mt-2 sm:mt-0">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EventCard({ event }: { event: MandirEvent }) {
  const cancelled = event.status === "cancelled";
  return (
    <article className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-5">
      <p className="text-marigold-ink font-semibold">
        {formatEventStart(event.starts_at, event.all_day)}
      </p>
      <h3 className={`text-xl font-bold ${cancelled ? "line-through" : ""}`}>
        {event.title}
      </h3>
      {cancelled && (
        <p>
          <Badge tone="kumkum">Cancelled</Badge>
        </p>
      )}
      {event.summary && <p>{event.summary}</p>}
      {(event.location_note || event.cost_note) && (
        <p className="text-muted">
          {[event.location_note, event.cost_note].filter(Boolean).join(" · ")}
        </p>
      )}
      {event.link && (
        <a
          href={event.link}
          rel="noopener"
          className="text-peacock font-semibold underline"
        >
          More details
        </a>
      )}
      {event.confirmed_at && (
        <p className="text-muted text-base">
          Confirmed by the mandir,{" "}
          {new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/London",
            day: "numeric",
            month: "short",
          }).format(new Date(event.confirmed_at))}
        </p>
      )}
    </article>
  );
}

function NoEvents({ website }: { website: string | null }) {
  return (
    <div className="bg-sunk rounded-2xl p-5">
      <p className="font-semibold">No events listed yet.</p>
      <p className="text-muted">
        We&apos;re asking mandirs to add their events.{" "}
        {website ? (
          <>
            Until then, check{" "}
            <a href={website} rel="noopener" className="text-peacock underline">
              {websiteLabel(website)}
            </a>{" "}
            or the mandir&apos;s noticeboard.
          </>
        ) : (
          <>Until then, check the mandir&apos;s noticeboard.</>
        )}
      </p>
    </div>
  );
}
