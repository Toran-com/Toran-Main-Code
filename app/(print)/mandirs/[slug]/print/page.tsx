import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTile } from "@/components/date-tile";
import { Logo, Toran } from "@/components/ornaments";
import { LoadProblem } from "@/components/public-shell";
import { PrintButton } from "@/components/print-button";
import { getMandir, listMandirs } from "@/lib/directory";
import { formatEventStart } from "@/lib/format";
import { qrPath } from "@/lib/qr";
import { describeRule } from "@/lib/recurrence";
import { pageMetadata, siteUrl } from "@/lib/site";

// A one-page A4 notice of a mandir's upcoming events, for the noticeboard
// or to hand out, with a QR code to the live page. Static like the mandir
// page, so it changes when the committee's events do.
export const ensureStatic = "navigation";

// How many events fit on one A4 page at a readable size.
const MAX_EVENTS = 10;

const NO_MANDIRS = "no-mandirs-yet";

export async function generateStaticParams() {
  const result = await listMandirs();
  const slugs = result.state === "ok" ? result.data.map((m) => m.slug) : [];
  return (slugs.length ? slugs : [NO_MANDIRS]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]/print">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getMandir(slug);
  const name = result.state === "ok" && result.data ? result.data.name : null;
  return {
    ...pageMetadata(name ? `Print: ${name}` : "Print"),
    robots: { index: false },
  };
}

export default async function PrintPage({
  params,
}: PageProps<"/mandirs/[slug]/print">) {
  const { slug } = await params;
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what="mandir's page" />;
  }
  if (!result.data) notFound();
  const mandir = result.data;

  const events = mandir.events
    .filter((e) => e.status !== "cancelled")
    .slice(0, MAX_EVENTS);
  const url = `${siteUrl()}/mandirs/${mandir.slug}`;
  const qr = qrPath(url);

  return (
    <>
      <div className="flex flex-col gap-3 print:hidden">
        <Link
          href={`/mandirs/${mandir.slug}`}
          className="text-peacock self-start font-semibold"
        >
          ← Back to {mandir.name}
        </Link>
        <p className="text-muted">
          A one-page A4 notice of what&apos;s on, for your noticeboard or to
          hand out. The QR code takes people to the latest events.
        </p>
        <PrintButton label="Print this page" />
      </div>

      <article className="flex flex-col gap-6 [print-color-adjust:exact]">
        <header className="flex flex-col gap-1">
          <Toran />
          <p className="text-marigold-ink pt-4 text-base font-semibold tracking-[0.12em] uppercase">
            What&apos;s on at
          </p>
          <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
            {mandir.name}
          </h1>
          <p className="text-muted text-xl">
            {mandir.town}
            {mandir.postcode && `, ${mandir.postcode}`}
          </p>
        </header>

        {events.length ? (
          <ul className="divide-line border-line flex flex-col divide-y border-y">
            {events.map((event) => (
              <li key={event.id} className="flex break-inside-avoid gap-4 py-3">
                <DateTile
                  date={event.next_starts_at}
                  label={formatEventStart(event.next_starts_at, true)}
                  size="sm"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 className="text-xl leading-snug font-semibold">
                    {event.title}
                  </h2>
                  <p className="text-muted">
                    {event.recurrence &&
                      `${describeRule(event.recurrence)} · next `}
                    {formatEventStart(event.next_starts_at, event.all_day)}
                  </p>
                  {event.summary && <p>{event.summary}</p>}
                  {(event.location_note || event.cost_note) && (
                    <p className="text-muted">
                      {[event.location_note, event.cost_note]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-lg">
            No events are listed yet. Scan the code below to see the latest.
          </p>
        )}

        <footer className="flex break-inside-avoid items-center gap-5">
          <svg
            viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
            role="img"
            aria-label={`QR code for ${url}`}
            className="size-32 shrink-0 bg-white"
            shapeRendering="crispEdges"
          >
            <path d={qr.d} fill="#000" />
          </svg>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-lg font-semibold">
              Scan for the latest events and to share them on WhatsApp.
            </p>
            <p className="text-muted break-all">{url}</p>
          </div>
          <span className="text-ink hidden shrink-0 sm:block print:block">
            <Logo size="sm" />
          </span>
        </footer>
      </article>
    </>
  );
}
