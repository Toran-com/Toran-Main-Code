import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AddToCalendar } from "@/components/add-to-calendar";
import { DateTile } from "@/components/date-tile";
import { CalendarIcon, ClockIcon, PinIcon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { Toran } from "@/components/ornaments";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ReadAloud } from "@/components/read-aloud";
import { ShareButtons } from "@/components/share-buttons";
import { cardClass, Notice, quietButtonClass } from "@/components/ui";
import {
  getEventSeva,
  getMandir,
  getMandirEvent,
  listMandirs,
  type EventSeva,
  type MandirEventPage,
} from "@/lib/directory";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import {
  formatEventStart,
  formatEventWhen,
  formatSpokenStart,
} from "@/lib/format";
import { readingText } from "@/lib/read-aloud";
import { describeRule } from "@/lib/recurrence";
import { placesTaken } from "@/lib/seva";
import { eventPath, eventShareText, sevaPath } from "@/lib/share";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData, eventData } from "@/lib/structured-data";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";

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
  const t = pageT();
  const rule = event.recurrence && describeRule(event.recurrence);
  const when = event.recurrence
    ? t("event.repeatsNext", {
        rule: rule ?? t("event.repeats"),
        when: formatEventStart(event.next_starts_at, event.all_day),
      })
    : formatEventWhen(event.starts_at, event.ends_at, event.all_day);
  return [
    t("event.whenAt", { when, name: mandir.name, town: mandir.town }),
    event.summary,
  ]
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
    localePath(eventPath(slug, id)),
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
  const t = pageT();
  const [result, others, seva] = await Promise.all([
    getMandirEvent(slug, id),
    getMandir(slug),
    getEventSeva(slug, id),
  ]);
  if (result.state === "not connected") notFound();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.event")} />;
  }
  if (!result.data) notFound();
  const { mandir, event, upcoming } = result.data;
  const cancelled = event.status === "cancelled";
  const rule = event.recurrence && describeRule(event.recurrence);
  const mandirPath = localePath(`/mandirs/${mandir.slug}`);
  const path = eventPath(mandir.slug, event.id);
  const alsoOn =
    others.state === "ok" && others.data
      ? others.data.events.filter((e) => e.id !== event.id).slice(0, 3)
      : [];

  const confirmedOn =
    event.confirmed_at &&
    t("mandir.confirmedOn", {
      date: new Intl.DateTimeFormat(pageLocale() === "gu" ? "gu-IN" : "en-GB", {
        timeZone: "Europe/London",
        day: "numeric",
        month: "short",
      }).format(new Date(event.confirmed_at)),
    });
  const source = sourceLabel(event);

  return (
    <div className="page-wide flex flex-col gap-8 sm:gap-12">
      {upcoming && (
        <JsonLd data={eventData(event, mandir, `${siteUrl()}${path}`)} />
      )}
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: t("shell.mandirs"), url: `${siteUrl()}/mandirs` },
          { name: mandir.name, url: `${siteUrl()}/mandirs/${mandir.slug}` },
          { name: event.title, url: `${siteUrl()}${path}` },
        ])}
      />
      <div className="flex flex-col gap-4">
        <Link
          href={mandirPath}
          className="text-peacock self-start font-semibold hover:underline"
        >
          ← {mandir.name}
        </Link>

        {/* The page's bold moment: the date and name under a toran. */}
        <header className="own-toran bg-night text-on-night rise relative overflow-hidden rounded-[2rem]">
          <Toran night />
          <div
            aria-hidden="true"
            className="rangoli-art rangoli-art-night pointer-events-none absolute -top-16 -right-24 size-[22rem] opacity-20 sm:-right-16 sm:size-[32rem] sm:opacity-30"
          />
          <div className="relative flex flex-wrap items-end gap-x-8 gap-y-5 px-5 pt-2 pb-8 sm:px-12 sm:pt-4 sm:pb-12">
            <DateTile
              date={event.next_starts_at}
              label={formatEventStart(event.next_starts_at, true)}
              size="lg"
              night
            />
            <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-3">
              {(cancelled || !upcoming || rule || kindLabel(event.kind)) && (
                <p className="flex flex-wrap gap-2">
                  {cancelled && (
                    <span className="bg-kumkum rounded-full px-3 py-0.5 text-base font-semibold text-white">
                      {t("event.cancelled")}
                    </span>
                  )}
                  {!upcoming && (
                    <span className="bg-on-night/15 rounded-full px-3 py-0.5 text-base font-semibold">
                      {t("event.finished")}
                    </span>
                  )}
                  {rule && (
                    <span className="bg-night-accent/15 text-night-accent rounded-full px-3 py-0.5 text-base font-semibold">
                      {rule}
                    </span>
                  )}
                  {kindLabel(event.kind) && (
                    <span className="bg-on-night/10 rounded-full px-3 py-0.5 text-base font-semibold">
                      {kindLabel(event.kind)}
                    </span>
                  )}
                </p>
              )}
              <h1
                className={`font-display text-[2.75rem] leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl ${cancelled ? "line-through" : ""}`}
              >
                {event.title}
              </h1>
              {event.title_gu && (
                <p lang="gu" className="text-xl font-semibold sm:text-2xl">
                  {event.title_gu}
                </p>
              )}
              <Link
                href={mandirPath}
                className="text-night-muted hover:text-on-night w-fit text-lg underline decoration-1 underline-offset-4 sm:text-xl"
              >
                {mandir.name}, {mandir.town}
              </Link>
            </div>
          </div>
        </header>
      </div>

      {!upcoming && (
        <Notice>
          {t("event.finishedNote")}{" "}
          <Link href={mandirPath} className="underline">
            {t("event.seeWhatsOnAt", { name: mandir.name })}
          </Link>
          .
        </Notice>
      )}
      {cancelled && upcoming && (
        <Notice>
          {t("event.cancelledNote")}{" "}
          <Link href={mandirPath} className="underline">
            {t("event.seeElseAt", { name: mandir.name })}
          </Link>
          .
        </Notice>
      )}

      <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
        {/* First on a phone, so the time, place and buttons come straight
            after the name; beside the details on a wide screen, staying
            in view while you read. */}
        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4 lg:sticky lg:top-28 lg:order-2">
          <div className={`${cardClass} flex flex-col gap-6 p-6 sm:p-7`}>
            <ReadAloud text={spokenEvent(result.data)} />
            <Details page={result.data} />
            {confirmedOn ? (
              <Badge tone="leaf">
                <span aria-hidden="true">✓ </span>
                {confirmedOn}
              </Badge>
            ) : (
              source && <p className="text-muted text-base">{source}</p>
            )}
            {upcoming && !cancelled && (
              <div className="flex flex-col gap-3">
                <AddToCalendar
                  mandirSlug={mandir.slug}
                  eventId={event.id}
                  title={event.title}
                  primary
                />
                <ShareButtons
                  text={eventShareText(event, mandir)}
                  path={localePath(path)}
                />
              </div>
            )}
          </div>
          <Link
            prefetch={false}
            href={`/corrections?page=${encodeURIComponent(path)}`}
            className="text-muted self-center text-base"
          >
            {t("page.somethingWrong")}
          </Link>
        </aside>

        <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-12 sm:gap-16">
          {(event.summary || event.summary_gu) && (
            <section
              aria-labelledby="about"
              className="flex max-w-2xl flex-col gap-4"
            >
              <h2
                id="about"
                className="font-display text-4xl leading-tight sm:text-5xl"
              >
                {t("event.about")}
              </h2>
              {event.summary && (
                <p className="text-lg leading-relaxed sm:text-xl">
                  {event.summary}
                </p>
              )}
              {event.summary_gu && (
                <p lang="gu" className="text-lg leading-relaxed sm:text-xl">
                  {event.summary_gu}
                </p>
              )}
            </section>
          )}

          {upcoming && !cancelled && seva.state === "ok" && seva.data?.open && (
            <Seva
              path={localePath(sevaPath(mandir.slug, event.id))}
              seva={seva.data}
            />
          )}

          {alsoOn.length > 0 && (
            <section aria-labelledby="also-on" className="flex flex-col">
              <h2
                id="also-on"
                className="font-display mb-2 text-4xl leading-tight sm:text-5xl"
              >
                {t("event.alsoAt", { name: mandir.name })}
              </h2>
              <ul className="divide-line flex flex-col divide-y">
                {alsoOn.map((e) => (
                  <li
                    key={e.id}
                    className="has-card-link group flex items-center gap-4 py-4 sm:gap-5"
                  >
                    <DateTile
                      date={e.next_starts_at}
                      label={formatEventStart(e.next_starts_at, true)}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-col">
                      <Link
                        href={localePath(eventPath(mandir.slug, e.id))}
                        className="card-link group-hover:text-peacock text-lg leading-snug font-semibold no-underline sm:text-xl"
                      >
                        {e.title}
                      </Link>
                      <span className="text-muted">
                        {formatEventStart(e.next_starts_at, e.all_day)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href={mandirPath} className="text-peacock font-semibold">
              {t("event.everythingAt", { name: mandir.name })}
            </Link>
            <Link
              href={localePath("/whats-on")}
              className="text-peacock font-semibold"
            >
              {t("event.whatsOnNear")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// "Help with seva" when the committee lets volunteers take slots here.
function Seva({ path, seva }: { path: string; seva: EventSeva }) {
  const shifts = seva.roles.flatMap((r) => (r.needs_dbs ? [] : r.shifts));
  if (!shifts.length) return null;
  const taken = shifts.reduce((n, s) => n + placesTaken(s), 0);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);
  const t = pageT();
  return (
    <section
      aria-labelledby="seva"
      className="bg-sunk flex flex-col gap-4 rounded-3xl p-6 sm:p-8"
    >
      <h2 id="seva" className="font-display text-4xl leading-tight">
        {t("seva.help")}
      </h2>
      <p className="text-lg">
        <strong>{t("seva.takenOf", { taken, needed })}</strong>{" "}
        {t("seva.placesTaken")}
      </p>
      <Link href={path} className={`${quietButtonClass} self-start`}>
        {taken < needed ? t("seva.take") : t("seva.seeRota")}
      </Link>
    </section>
  );
}

// When and where, each with its icon, as the top of the side panel.
// The event in a few sentences, for "Read aloud": in Gujarati where the
// mandir gave its name and description in Gujarati.
function spokenEvent({ mandir, event }: MandirEventPage): string {
  const t = pageT();
  const gu = pageLocale() === "gu";
  const rule = event.recurrence && describeRule(event.recurrence);
  return readingText([
    gu && event.title_gu ? event.title_gu : event.title,
    event.status === "cancelled" && t("event.cancelled"),
    rule,
    formatSpokenStart(event.next_starts_at, event.all_day),
    `${mandir.name}, ${mandir.town}`,
    event.location_note,
    gu && event.summary_gu ? event.summary_gu : event.summary,
    event.cost_note,
    mandir.getting_there,
  ]);
}

function Details({ page }: { page: MandirEventPage }) {
  const { mandir, event } = page;
  const t = pageT();
  const rule = event.recurrence && describeRule(event.recurrence);
  const directions = mandir.postcode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${mandir.name} ${mandir.postcode}`,
      )}`
    : null;
  const rows: { label: string; icon: ReactNode; value: ReactNode }[] = [
    {
      label: t("event.when"),
      icon: event.recurrence ? <CalendarIcon /> : <ClockIcon />,
      value: event.recurrence ? (
        <>
          <strong>{rule ?? t("event.repeats")}</strong>
          <br />
          {t("event.next", {
            when: formatEventStart(event.next_starts_at, event.all_day),
          })}
        </>
      ) : (
        <strong>
          {formatEventWhen(event.starts_at, event.ends_at, event.all_day)}
        </strong>
      ),
    },
    {
      label: t("event.where"),
      icon: <PinIcon />,
      value: (
        <>
          <Link
            href={localePath(`/mandirs/${mandir.slug}`)}
            className="text-ink font-semibold no-underline hover:underline"
          >
            {mandir.name}
          </Link>
          <br />
          {mandir.town}
          {mandir.postcode && ` ${mandir.postcode}`}
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
                {t("mandir.directions")}
              </a>
            </>
          )}
        </>
      ),
    },
  ];
  if (mandir.getting_there)
    rows.push({
      label: t("mandir.gettingThere"),
      icon: null,
      value: (
        <span className="whitespace-pre-line">{mandir.getting_there}</span>
      ),
    });
  if (event.cost_note)
    rows.push({ label: t("event.cost"), icon: null, value: event.cost_note });
  if (event.link) {
    rows.push({
      label: t("event.moreDetails"),
      icon: null,
      value: (
        <a
          href={event.link}
          rel="noopener"
          className="text-peacock font-semibold break-all underline"
        >
          {t("event.fromMandir")}
        </a>
      ),
    });
  }
  return (
    <dl className="flex flex-col gap-5">
      {rows.map(({ label, icon, value }) => (
        <div key={label} className="relative pl-[2.375rem]">
          <dt className="text-muted text-base">
            <span className="text-peacock absolute top-1 left-0 [&_svg]:size-6">
              {icon}
            </span>
            {label}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
