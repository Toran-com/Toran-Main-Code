import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyText } from "@/components/copy-text";
import { DateTile } from "@/components/date-tile";
import { Logo, Toran } from "@/components/ornaments";
import { PrintButton } from "@/components/print-button";
import { buttonClass, Card, quietButtonClass } from "@/components/ui";
import { listFestivalDates, listMandirs } from "@/lib/directory";
import { formatDateRange, formatEventStart } from "@/lib/format";
import { qrPath } from "@/lib/qr";
import { kitMessage, mandirKit } from "@/lib/season-kit";
import { bannerSeason } from "@/lib/festival-season";
import { pageMetadata, siteUrl } from "@/lib/site";

// A mandir's kit for the festival season coming up (lib/season-kit.ts):
// a picture and a message to send on WhatsApp, and a one-page sheet for
// the noticeboard. Public like the mandir's page, and saved ahead like it.
export const ensureStatic = "navigation";

// How many events fit on one A4 page at a readable size.
const MAX_EVENTS = 10;

const NONE = { slug: "no-mandirs-yet", season: "none" };

export async function generateStaticParams() {
  const [mandirs, dates] = await Promise.all([
    listMandirs(),
    listFestivalDates(),
  ]);
  const showing = dates.state === "ok" ? bannerSeason(dates.data) : null;
  if (!showing || mandirs.state !== "ok" || !mandirs.data.length) {
    return [NONE];
  }
  return mandirs.data.map((m) => ({
    slug: m.slug,
    season: showing.season.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps<"/mandirs/[slug]/kit/[season]">): Promise<Metadata> {
  const { slug, season } = await params;
  const kit = await mandirKit(slug, season);
  return {
    ...pageMetadata(
      kit ? `${kit.season.period} at ${kit.mandir.name}` : "Festival kit",
    ),
    robots: { index: false },
  };
}

export default async function KitPage({
  params,
}: PageProps<"/mandirs/[slug]/kit/[season]">) {
  const { slug, season } = await params;
  const kit = await mandirKit(slug, season);
  if (!kit) notFound();

  const { mandir, events } = kit;
  const url = `${siteUrl()}/mandirs/${mandir.slug}`;
  const picture = `/mandirs/${mandir.slug}/kit/${kit.season.slug}/picture.png`;
  const message = kitMessage(kit, url);
  const qr = qrPath(url);
  const sheet = events.slice(0, MAX_EVENTS);

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        <Link
          href={`/mandirs/${mandir.slug}`}
          className="text-peacock self-start font-semibold"
        >
          ← Back to {mandir.name}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Share your {kit.season.period} programme
          </h1>
          <p className="text-muted text-lg">
            Everything {mandir.name} has on Toran for {kit.season.period}, ready
            to send to your WhatsApp groups and to put on the noticeboard. It
            changes when your events do.
          </p>
        </div>

        <Card>
          <h2 className="text-2xl font-bold">A picture for WhatsApp</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- a picture to download, made on the server */}
          <img
            src={picture}
            width={540}
            height={675}
            alt={`${kit.season.period} at ${mandir.name}: ${events
              .map(
                (e) =>
                  `${formatEventStart(e.next_starts_at, e.all_day)}, ${e.title}`,
              )
              .join("; ")}`}
            className="border-line h-auto w-full max-w-[540px] rounded-2xl border"
          />
          <p className="text-muted">
            Send it in your mandir&apos;s groups, or set it as your WhatsApp
            status.
          </p>
          <a
            href={picture}
            download={`${mandir.slug}-${kit.season.slug}.png`}
            className={`${buttonClass} self-start`}
          >
            Download the picture
          </a>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold">A message to send with it</h2>
          <p className="bg-sunk rounded-2xl p-4 whitespace-pre-line">
            {message}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              className={quietButtonClass}
            >
              Send on WhatsApp
            </a>
            <CopyText text={message} label="Copy the message" />
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-bold">A sheet for the noticeboard</h2>
          <p className="text-muted">
            One A4 page with your {kit.season.period} events and a QR code to
            the latest details. It&apos;s below; print it from here.
          </p>
          <PrintButton label="Print the sheet" />
        </Card>
      </div>

      <article className="border-line flex flex-col gap-6 border-t pt-8 [print-color-adjust:exact] print:border-0 print:pt-0">
        <header className="flex flex-col gap-1">
          <Toran />
          <p className="text-marigold-ink pt-4 text-base font-semibold tracking-[0.12em] uppercase">
            {kit.season.period} at
          </p>
          <h2 className="font-display text-5xl leading-[1.05] tracking-tight">
            {mandir.name}
          </h2>
          <p className="text-muted text-xl">
            {mandir.town}
            {mandir.postcode && `, ${mandir.postcode}`}
          </p>
        </header>

        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-lg">
          {kit.days.map((d) => (
            <li key={d.slug}>
              <span className="font-semibold">{d.name}</span>{" "}
              <span className="text-muted">
                {formatDateRange(d.starts_on, d.ends_on)}
              </span>
            </li>
          ))}
        </ul>

        <ul className="divide-line border-line flex flex-col divide-y border-y">
          {sheet.map((event) => (
            <li key={event.id} className="flex break-inside-avoid gap-4 py-3">
              <DateTile
                date={event.next_starts_at}
                label={formatEventStart(event.next_starts_at, true)}
                size="sm"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="text-xl leading-snug font-semibold">
                  {event.title}
                </h3>
                {event.title_gu && (
                  <p lang="gu" className="font-semibold">
                    {event.title_gu}
                  </p>
                )}
                <p className="text-muted">
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
              Scan for the latest details, to add them to your calendar and to
              share them on WhatsApp.
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
