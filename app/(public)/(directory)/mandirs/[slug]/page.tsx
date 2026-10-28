import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DateTile } from "@/components/date-tile";
import { FollowButton } from "@/components/follow";
import { CallAndDirections, directionsTo } from "@/components/call-directions";
import { GlobeIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ReadAloud } from "@/components/read-aloud";
import { ShareButtons } from "@/components/share-buttons";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { OpeningTimes, OpenNowBadge } from "@/components/opening-times";
import { VisitingInfo } from "@/components/visiting-info";
import { actionPillClass, quietButtonClass } from "@/components/ui";
import {
  getMandir,
  listMandirs,
  type MandirDetails,
  type MandirEvent,
} from "@/lib/directory";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import {
  dateLocale,
  formatEventStart,
  formatSpokenStart,
  formatTimeOfDay,
  websiteLabel,
} from "@/lib/format";
import { readingText } from "@/lib/read-aloud";
import { describeRule } from "@/lib/recurrence";
import { eventPath } from "@/lib/share";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData, eventData, mandirData } from "@/lib/structured-data";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { localePath, pageLocale, pageT, seasonText } from "@/lib/i18n/page";
import { mandirKit } from "@/lib/season-kit";

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
  return pageMetadata(
    `${name}, ${town}`,
    pageT()("mandir.description", { name, town }),
    localePath(`/mandirs/${slug}`),
  );
}

export default async function MandirPage({
  params,
}: PageProps<"/mandirs/[slug]">) {
  const { slug } = await params;
  const t = pageT();
  const [result, kit] = await Promise.all([getMandir(slug), mandirKit(slug)]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.mandirPage")} />;
  }
  if (!result.data) notFound();
  const mandir = result.data;

  return (
    <div className="page-wide flex flex-col gap-10 sm:gap-14">
      <JsonLd
        data={mandirData(mandir, `${siteUrl()}/mandirs/${mandir.slug}`)}
      />
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: t("shell.mandirs"), url: `${siteUrl()}/mandirs` },
          { name: mandir.name, url: `${siteUrl()}/mandirs/${mandir.slug}` },
        ])}
      />
      <header className="border-line relative flex flex-col gap-5 border-b pb-10 sm:pb-14">
        <div
          aria-hidden="true"
          className="rangoli-art pointer-events-none absolute -top-6 right-0 hidden size-80 opacity-[0.12] md:block"
        />
        <Link
          href={localePath("/mandirs")}
          className="text-peacock relative self-start font-semibold hover:underline"
        >
          {t("mandir.all")}
        </Link>
        <div className="rise relative flex max-w-4xl flex-col gap-4">
          <div className="flex flex-wrap items-start gap-x-4 gap-y-3 sm:gap-x-6">
            <h1 className="font-display min-w-0 flex-1 text-5xl leading-[1.02] tracking-tight sm:text-7xl">
              {mandir.name}
            </h1>
            <FollowButton slug={mandir.slug} beside />
          </div>
          <p className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-lg sm:text-xl">
            <span>
              {mandir.town}, {regionName(mandir.region)}
            </span>
            {mandir.tradition && <span>{mandir.tradition}</span>}
            {mandir.status === "claimed" && (
              <Badge tone="leaf">
                <span aria-hidden="true">✓ </span>
                {t("mandir.runByCommittee")}
              </Badge>
            )}
          </p>
          <OpenNowBadge hours={mandir.opening_hours} />
          <QuickLinks mandir={mandir} />
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
        <section
          aria-labelledby="whats-on"
          className="flex min-w-0 flex-[999_1_34rem] flex-col"
        >
          <h2
            id="whats-on"
            className="font-display mb-2 text-4xl leading-tight sm:text-5xl"
          >
            {t("shell.whatsOn")}
          </h2>
          {mandir.events.length ? (
            <ul className="divide-line flex flex-col divide-y">
              {mandir.events.map((event) => (
                <li key={event.id}>
                  <EventRow event={event} mandir={mandir} />
                </li>
              ))}
            </ul>
          ) : (
            <NoEvents website={mandir.website} />
          )}
          <More
            links={[
              {
                href: localePath(`/mandirs/${mandir.slug}/tell-us`),
                label: t("mandir.tellUs"),
              },
              mandir.events.length > 0 && {
                href: localePath(`/mandirs/${mandir.slug}/print`),
                label: t("mandir.print"),
              },
              kit && {
                href: `/mandirs/${mandir.slug}/kit/${kit.season.slug}`,
                label: t("mandir.kit", {
                  period: seasonText(kit.season).period,
                }),
              },
              {
                href: localePath("/festivals"),
                label: t("mandir.festivalDates"),
              },
            ]}
          />
        </section>

        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-8">
          <SubscribeCalendar
            path={`/mandirs/${mandir.slug}/calendar.ics`}
            title={t("mandir.calendarTitle")}
            body={t("mandir.calendarBody", { name: mandir.name })}
            night
          />
          <Facts mandir={mandir} />
          <OpeningTimes
            hours={mandir.opening_hours}
            aartis={mandir.aarti_times}
          />
          <VisitingInfo
            facilities={mandir.facilities}
            note={mandir.visiting_note}
            phone={mandir.phone}
          />
          <section
            aria-labelledby="committee"
            className="bg-sunk flex flex-col gap-3 rounded-3xl p-6"
          >
            <h2 id="committee" className="text-xl font-semibold">
              {t("mandir.committeeTitle")}
            </h2>
            {mandir.status === "claimed" ? (
              <p className="text-muted">
                {t("mandir.claimedBefore")}{" "}
                <Link href="/account" className="text-peacock underline">
                  {t("mandir.logIn")}
                </Link>{" "}
                {t("mandir.claimedAfter")}
              </p>
            ) : (
              <p className="text-muted">{t("mandir.lookAfterBody")}</p>
            )}
            <Link
              href={localePath(`/mandirs/${mandir.slug}/claim`)}
              className={`${quietButtonClass} self-start`}
            >
              {t("mandir.lookAfter")}
            </Link>
          </section>
          <Link
            prefetch={false}
            href={`/corrections?page=${encodeURIComponent(`/mandirs/${mandir.slug}`)}`}
            className="text-muted self-center text-base"
          >
            {t("page.somethingWrong")}
          </Link>
        </aside>
      </div>
    </div>
  );
}

// The mandir and its next few events in a few sentences, for "Read
// aloud".
function spokenMandir(mandir: MandirDetails): string {
  const t = pageT();
  const gu = pageLocale() === "gu";
  return readingText([
    `${mandir.name}, ${mandir.town}`,
    mandir.tradition,
    mandir.events.length > 0 && t("shell.whatsOn"),
    ...mandir.events
      .slice(0, 5)
      .map(
        (e) =>
          `${gu && e.title_gu ? e.title_gu : e.title}: ${formatSpokenStart(e.next_starts_at, e.all_day)}`,
      ),
    mandir.getting_there,
  ]);
}

function Facts({ mandir }: { mandir: MandirDetails }) {
  const t = pageT();
  const directions = directionsTo(mandir);
  const rows: { label: string; value: ReactNode }[] = [];
  if (mandir.postcode && directions) {
    rows.push({
      label: t("mandir.postcode"),
      value: (
        <>
          {mandir.postcode} ·{" "}
          <a href={directions} className="text-peacock font-semibold underline">
            {t("mandir.directions")}
          </a>
        </>
      ),
    });
  }
  if (mandir.website) {
    rows.push({
      label: t("mandir.website"),
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
      label: t("mandir.phone"),
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
    rows.push({ label: t("mandir.charity"), value: mandir.charity_number });
  }
  if (!rows.length && !mandir.getting_there) return null;

  return (
    <section aria-labelledby="about" className="flex flex-col gap-2">
      <h2 id="about" className="text-xl font-semibold">
        {t("mandir.about")}
      </h2>
      <dl className="divide-line border-line flex flex-col divide-y border-y">
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-3"
          >
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {mandir.getting_there && (
        <div className="flex flex-col gap-1 pt-1">
          <h3 className="font-semibold">{t("mandir.gettingThere")}</h3>
          <p className="text-muted whitespace-pre-line">
            {mandir.getting_there}
          </p>
        </div>
      )}
    </section>
  );
}

// The things people most often want, in one tap: directions and a call
// as big buttons, then one row for the mandir's own website, sharing the
// page and hearing it read aloud.
function QuickLinks({ mandir }: { mandir: MandirDetails }) {
  const t = pageT();
  return (
    <div className="flex flex-col gap-3 pt-1">
      <CallAndDirections mandir={mandir} />
      <div className="flex flex-wrap items-start gap-2">
        {mandir.website && (
          <a href={mandir.website} rel="noopener" className={actionPillClass}>
            <GlobeIcon />
            {t("mandir.website")}
          </a>
        )}
        <ShareButtons
          label={t("mandir.share")}
          text={t("mandir.shareText", { name: mandir.name, town: mandir.town })}
          path={localePath(`/mandirs/${mandir.slug}`)}
          copy={false}
        />
        <ReadAloud text={spokenMandir(mandir)} />
      </div>
    </div>
  );
}

// One of the mandir's events as a tidy row: its date tile, name, time,
// a line of what it is and its badges. The whole row opens the event's
// page, which has the calendar, sharing and plan buttons.
function EventRow({
  event,
  mandir,
}: {
  event: MandirEvent;
  mandir: MandirDetails;
}) {
  const t = pageT();
  const cancelled = event.status === "cancelled";
  const rule = event.recurrence && describeRule(event.recurrence);
  const kind = kindLabel(event.kind);
  const confirmed =
    event.confirmed_at &&
    t("mandir.confirmedOn", {
      date: new Intl.DateTimeFormat(dateLocale(), {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
      }).format(new Date(event.confirmed_at)),
    });
  const summary = (pageLocale() === "gu" && event.summary_gu) || event.summary;
  return (
    <article
      id={`event-${event.id}`}
      className="has-card-link group flex scroll-mt-28 gap-4 py-5 sm:gap-6 sm:py-6"
    >
      <DateTile
        date={event.next_starts_at}
        label={formatEventStart(event.next_starts_at, true)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          className={`text-xl leading-snug font-semibold ${cancelled ? "line-through" : ""}`}
        >
          <Link
            href={localePath(eventPath(mandir.slug, event.id))}
            className="card-link group-hover:text-peacock no-underline"
          >
            {event.title}
          </Link>
        </h3>
        {event.title_gu && (
          <p lang="gu" className="font-semibold">
            {event.title_gu}
          </p>
        )}
        <p className="text-muted">
          {event.recurrence
            ? `${t("event.repeatNext", { rule: rule ?? "" })}${formatEventStart(event.next_starts_at, event.all_day)}`
            : formatTimeOfDay(event.next_starts_at, event.all_day)}
        </p>
        {summary && <p className="text-muted line-clamp-2">{summary}</p>}
        {(cancelled || confirmed || kind || sourceLabel(event)) && (
          <p className="mt-1 flex flex-wrap items-center gap-2">
            {cancelled && <Badge tone="kumkum">{t("event.cancelled")}</Badge>}
            {confirmed ? (
              <Badge tone="leaf">
                <span aria-hidden="true">✓ </span>
                {confirmed}
              </Badge>
            ) : (
              sourceLabel(event) && (
                <span className="text-muted text-base">
                  {sourceLabel(event)}
                </span>
              )
            )}
            {kind && <Badge>{kind}</Badge>}
          </p>
        )}
        <JsonLd
          data={eventData(
            event,
            mandir,
            `${siteUrl()}${eventPath(mandir.slug, event.id)}`,
          )}
        />
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="text-peacock mt-1 size-6 shrink-0 transition-transform group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </article>
  );
}

// The other things to do from here, together under "More" rather than
// loose links under the events.
function More({
  links,
}: {
  links: (false | null | undefined | { href: string; label: string })[];
}) {
  const t = pageT();
  const shown = links.filter((l) => !!l);
  return (
    <section aria-labelledby="more" className="flex flex-col gap-2 pt-8">
      <h2 id="more" className="text-xl font-semibold">
        {t("mandir.more")}
      </h2>
      <ul className="divide-line border-line flex flex-col divide-y border-y">
        {shown.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-peacock flex min-h-12 items-center py-3 font-semibold no-underline hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoEvents({ website }: { website: string | null }) {
  const t = pageT();
  return (
    <div className="bg-sunk mt-2 rounded-3xl p-6">
      <p className="font-semibold">{t("whatsOn.noneYet")}</p>
      <p className="text-muted">
        {t("mandir.asking")}{" "}
        {website ? (
          <>
            {t("mandir.untilThenCheck")}{" "}
            <a href={website} rel="noopener" className="text-peacock underline">
              {websiteLabel(website)}
            </a>{" "}
            {t("mandir.orNoticeboard")}
          </>
        ) : (
          <>{t("mandir.untilThenNoticeboard")}</>
        )}
      </p>
    </div>
  );
}

// A region in the page's language, or as stored if it has no translation.
function regionName(region: string): string {
  const key = regionKey(region);
  return key ? pageT()(key) : region;
}
