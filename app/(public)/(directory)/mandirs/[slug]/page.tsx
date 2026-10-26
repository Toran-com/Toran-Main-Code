import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DateTile } from "@/components/date-tile";
import { EventActions } from "@/components/event-actions";
import { FollowButton } from "@/components/follow";
import { GlobeIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Badge, LoadProblem } from "@/components/public-shell";
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
import { formatEventStart, formatTimeOfDay, websiteLabel } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { eventPath, eventShareText } from "@/lib/share";
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
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
            {mandir.name}
          </h1>
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
          <FollowButton slug={mandir.slug} />
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
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-6">
            <Link
              href={localePath(`/mandirs/${mandir.slug}/tell-us`)}
              className="text-peacock font-semibold"
            >
              {t("mandir.tellUs")}
            </Link>
            <Link
              href={localePath("/festivals")}
              className="text-peacock font-semibold"
            >
              {t("mandir.festivalDates")}
            </Link>
            {mandir.events.length > 0 && (
              <Link
                href={localePath(`/mandirs/${mandir.slug}/print`)}
                className="text-peacock font-semibold"
              >
                {t("mandir.print")}
              </Link>
            )}
            {kit && (
              <Link
                href={`/mandirs/${mandir.slug}/kit/${kit.season.slug}`}
                className="text-peacock font-semibold"
              >
                {t("mandir.kit", { period: seasonText(kit.season).period })}
              </Link>
            )}
          </div>
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

function directionsTo(mandir: MandirDetails): string | null {
  return mandir.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${mandir.name} ${mandir.postcode}`,
      )}`
    : null;
}

// The things people most often want, in one tap: directions, the
// mandir's own website, a call, or sharing the page.
function QuickLinks({ mandir }: { mandir: MandirDetails }) {
  const t = pageT();
  const directions = directionsTo(mandir);
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {directions && (
        <a
          href={directions}
          rel="noopener"
          className="bg-peacock text-on-peacock hover:bg-peacock-deep inline-flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold no-underline transition active:scale-95"
        >
          <PinIcon />
          {t("mandir.directions")}
        </a>
      )}
      {mandir.website && (
        <a href={mandir.website} rel="noopener" className={actionPillClass}>
          <GlobeIcon />
          {t("mandir.website")}
        </a>
      )}
      {mandir.phone && (
        <a
          href={`tel:${mandir.phone.replace(/\s/g, "")}`}
          className={actionPillClass}
        >
          <PhoneIcon />
          {t("mandir.call")}
        </a>
      )}
      <ShareButtons
        label={t("mandir.share")}
        text={t("mandir.shareText", { name: mandir.name, town: mandir.town })}
        path={localePath(`/mandirs/${mandir.slug}`)}
      />
    </div>
  );
}

// One of the mandir's events as a row: its date tile, the details from
// the patrika, and buttons to add it to a calendar or share it.
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
  const confirmed =
    event.confirmed_at &&
    t("mandir.confirmedOn", {
      date: new Intl.DateTimeFormat(pageLocale() === "gu" ? "gu-IN" : "en-GB", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
      }).format(new Date(event.confirmed_at)),
    });
  return (
    <article
      id={`event-${event.id}`}
      className="flex scroll-mt-28 gap-4 py-6 sm:gap-6"
    >
      <DateTile
        date={event.next_starts_at}
        label={formatEventStart(event.next_starts_at, true)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3
          className={`text-xl leading-snug font-semibold ${cancelled ? "line-through" : ""}`}
        >
          <Link
            href={localePath(eventPath(mandir.slug, event.id))}
            className="hover:text-peacock no-underline hover:underline"
          >
            {event.title}
          </Link>
        </h3>
        {event.title_gu && (
          <p lang="gu" className="-mt-1 text-lg font-semibold">
            {event.title_gu}
          </p>
        )}
        <p className="text-muted">
          {event.recurrence
            ? `${t("event.repeatNext", { rule: rule ?? "" })}${formatEventStart(event.next_starts_at, event.all_day)}`
            : formatTimeOfDay(event.next_starts_at, event.all_day)}
        </p>
        {event.summary && <p>{event.summary}</p>}
        {event.summary_gu && <p lang="gu">{event.summary_gu}</p>}
        {(event.location_note || event.cost_note) && (
          <p className="text-muted">
            {[event.location_note, event.cost_note].filter(Boolean).join(" · ")}
          </p>
        )}
        {event.link && (
          <a
            href={event.link}
            rel="noopener"
            className="text-peacock w-fit font-semibold underline"
          >
            {t("event.moreDetails")}
          </a>
        )}
        <p className="flex flex-wrap items-center gap-2">
          {cancelled && <Badge tone="kumkum">{t("event.cancelled")}</Badge>}
          {confirmed ? (
            <Badge tone="leaf">
              <span aria-hidden="true">✓ </span>
              {confirmed}
            </Badge>
          ) : (
            sourceLabel(event) && (
              <span className="text-muted text-base">{sourceLabel(event)}</span>
            )
          )}
          {kindLabel(event.kind) && <Badge>{kindLabel(event.kind)}</Badge>}
        </p>
        <JsonLd
          data={eventData(
            event,
            mandir,
            `${siteUrl()}${eventPath(mandir.slug, event.id)}`,
          )}
        />
        {!cancelled && (
          <div className="pt-2">
            <EventActions
              mandirSlug={mandir.slug}
              eventId={event.id}
              title={event.title}
              shareText={eventShareText(event, mandir)}
              path={localePath(eventPath(mandir.slug, event.id))}
              copy={false}
            />
          </div>
        )}
      </div>
    </article>
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
