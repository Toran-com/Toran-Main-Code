import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EventActions } from "@/components/event-actions";
import { GlobeIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { Card, Ornament, quietButtonClass } from "@/components/ui";
import {
  getMandir,
  listMandirs,
  type MandirDetails,
  type MandirEvent,
} from "@/lib/directory";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatEventStart, websiteLabel } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { eventPath, eventShareText } from "@/lib/share";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData, eventData, mandirData } from "@/lib/structured-data";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";

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
  const result = await getMandir(slug);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.mandirPage")} />;
  }
  if (!result.data) notFound();
  const mandir = result.data;

  return (
    <>
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
      <Link
        href={localePath("/mandirs")}
        className="text-peacock self-start font-semibold hover:underline"
      >
        {t("mandir.all")}
      </Link>
      <div className="rise flex flex-col gap-2 sm:gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {mandir.name}
        </h1>
        <Ornament />
        <p className="text-muted text-lg sm:text-xl">
          {mandir.town}, {regionName(mandir.region)}
        </p>
        {mandir.status === "claimed" && (
          <p>
            <Badge tone="peacock">{t("mandir.runByCommittee")}</Badge>
          </p>
        )}
        <QuickLinks mandir={mandir} />
      </div>

      <section aria-labelledby="whats-on" className="flex flex-col gap-4">
        <h2 id="whats-on" className="font-display text-3xl font-bold">
          {t("shell.whatsOn")}
        </h2>
        {mandir.events.length ? (
          <ul className="rise-list flex flex-col gap-3">
            {mandir.events.map((event) => (
              <li key={event.id}>
                <EventCard event={event} mandir={mandir} />
              </li>
            ))}
          </ul>
        ) : (
          <NoEvents website={mandir.website} />
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href={localePath(`/mandirs/${mandir.slug}/tell-us`)}
            className="text-peacock font-semibold"
          >
            {t("mandir.tellUs")}
          </Link>
          <Link
            prefetch={false}
            href={`/corrections?page=${encodeURIComponent(`/mandirs/${mandir.slug}`)}`}
            className="text-peacock font-semibold"
          >
            {t("page.somethingWrong")}
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
        </div>
      </section>

      <Facts mandir={mandir} />

      <SubscribeCalendar
        path={`/mandirs/${mandir.slug}/calendar.ics`}
        title={t("mandir.calendarTitle")}
        body={t("mandir.calendarBody", { name: mandir.name })}
      />

      <Card>
        <h2 className="text-xl font-bold">{t("mandir.committeeTitle")}</h2>
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
      </Card>
    </>
  );
}

function Facts({ mandir }: { mandir: MandirDetails }) {
  const t = pageT();
  const directions = directionsTo(mandir);
  const rows: { label: string; value: ReactNode }[] = [];
  if (mandir.tradition)
    rows.push({ label: t("mandir.tradition"), value: mandir.tradition });
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
  if (!rows.length) return null;

  return (
    <section aria-labelledby="about" className="flex flex-col gap-3">
      <h2 id="about" className="font-display text-2xl font-bold">
        {t("mandir.about")}
      </h2>
      <dl className="border-line bg-surface shadow-card grid gap-x-6 gap-y-3 rounded-2xl border p-5 sm:grid-cols-[auto_1fr]">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted text-base">{label}</dt>
            <dd className="-mt-2 sm:mt-0">{value}</dd>
          </div>
        ))}
      </dl>
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
  const pill =
    "border-peacock/30 text-peacock hover:bg-peacock/10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-base font-semibold no-underline transition duration-200 hover:-translate-y-0.5 active:scale-95";
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {directions && (
        <a href={directions} rel="noopener" className={pill}>
          <PinIcon />
          {t("mandir.directions")}
        </a>
      )}
      {mandir.website && (
        <a href={mandir.website} rel="noopener" className={pill}>
          <GlobeIcon />
          {t("mandir.website")}
        </a>
      )}
      {mandir.phone && (
        <a href={`tel:${mandir.phone.replace(/\s/g, "")}`} className={pill}>
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

function EventCard({
  event,
  mandir,
}: {
  event: MandirEvent;
  mandir: MandirDetails;
}) {
  const t = pageT();
  const cancelled = event.status === "cancelled";
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
      className="border-line bg-surface lift shadow-card flex scroll-mt-4 flex-col gap-2 rounded-2xl border p-4 sm:p-5"
    >
      <p className="text-marigold-ink font-semibold">
        {event.recurrence &&
          t("event.repeatNext", { rule: describeRule(event.recurrence) ?? "" })}
        {formatEventStart(event.next_starts_at, event.all_day)}
      </p>
      <h3
        className={`text-xl leading-snug font-bold ${cancelled ? "line-through" : ""}`}
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
        {kindLabel(event.kind) && <Badge>{kindLabel(event.kind)}</Badge>}
        {confirmed ? (
          <span className="text-peacock text-base font-semibold">
            <span aria-hidden="true">✓ </span>
            {confirmed}
          </span>
        ) : (
          sourceLabel(event) && (
            <span className="text-muted text-base">{sourceLabel(event)}</span>
          )
        )}
      </p>
      <JsonLd
        data={eventData(
          event,
          mandir,
          `${siteUrl()}${eventPath(mandir.slug, event.id)}`,
        )}
      />
      {!cancelled && (
        <div className="pt-1">
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
    </article>
  );
}

function NoEvents({ website }: { website: string | null }) {
  const t = pageT();
  return (
    <div className="bg-sunk rounded-2xl p-5">
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
