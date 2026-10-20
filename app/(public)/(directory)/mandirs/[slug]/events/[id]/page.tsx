import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EventActions } from "@/components/event-actions";
import { JsonLd } from "@/components/json-ld";
import { Badge, LoadProblem } from "@/components/public-shell";
import { Card, Notice, Ornament, quietButtonClass } from "@/components/ui";
import {
  getEventSeva,
  getMandir,
  getMandirEvent,
  listMandirs,
  type EventSeva,
  type MandirEventPage,
} from "@/lib/directory";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatEventStart, formatEventWhen } from "@/lib/format";
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

  return (
    <>
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
      <Link
        href={mandirPath}
        className="text-peacock self-start font-semibold hover:underline"
      >
        ← {mandir.name}
      </Link>

      <div className="rise flex flex-col gap-2 sm:gap-3">
        <p className="text-marigold-ink text-lg font-semibold sm:text-xl">
          {event.recurrence &&
            t("event.repeatNext", { rule: rule ?? t("event.repeats") })}
          {formatEventStart(event.next_starts_at, event.all_day)}
        </p>
        <h1
          className={`font-display text-4xl font-extrabold tracking-tight sm:text-5xl ${cancelled ? "line-through" : ""}`}
        >
          {event.title}
        </h1>
        {event.title_gu && (
          <p lang="gu" className="text-xl font-semibold sm:text-2xl">
            {event.title_gu}
          </p>
        )}
        <Ornament />
        {(cancelled || !upcoming || kindLabel(event.kind)) && (
          <p className="flex flex-wrap gap-2">
            {cancelled && <Badge tone="kumkum">{t("event.cancelled")}</Badge>}
            {!upcoming && <Badge>{t("event.finished")}</Badge>}
            {kindLabel(event.kind) && <Badge>{kindLabel(event.kind)}</Badge>}
          </p>
        )}
        {upcoming && !cancelled && (
          <div className="pt-1">
            <EventActions
              mandirSlug={mandir.slug}
              eventId={event.id}
              title={event.title}
              shareText={eventShareText(event, mandir)}
              path={localePath(path)}
            />
          </div>
        )}
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

      <Details page={result.data} />

      {upcoming && !cancelled && seva.state === "ok" && seva.data?.open && (
        <SevaCard
          path={localePath(sevaPath(mandir.slug, event.id))}
          seva={seva.data}
        />
      )}

      {(event.summary || event.summary_gu) && (
        <section aria-labelledby="about" className="flex flex-col gap-2">
          <h2 id="about" className="font-display text-2xl font-bold">
            {t("event.about")}
          </h2>
          {event.summary && <p>{event.summary}</p>}
          {event.summary_gu && <p lang="gu">{event.summary_gu}</p>}
        </section>
      )}

      <p className="text-muted text-base">
        {event.confirmed_at
          ? t("mandir.confirmedOn", {
              date: new Intl.DateTimeFormat(
                pageLocale() === "gu" ? "gu-IN" : "en-GB",
                { timeZone: "Europe/London", day: "numeric", month: "short" },
              ).format(new Date(event.confirmed_at)),
            })
          : sourceLabel(event)}
      </p>

      {alsoOn.length > 0 && (
        <section aria-labelledby="also-on" className="flex flex-col gap-3">
          <h2 id="also-on" className="font-display text-2xl font-bold">
            {t("event.alsoAt", { name: mandir.name })}
          </h2>
          <ul className="rise-list flex flex-col gap-3">
            {alsoOn.map((e) => (
              <li key={e.id}>
                <Link
                  href={localePath(eventPath(mandir.slug, e.id))}
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
          {t("event.everythingAt", { name: mandir.name })}
        </Link>
        <Link
          href={localePath("/whats-on")}
          className="text-peacock font-semibold"
        >
          {t("event.whatsOnNear")}
        </Link>
        <Link
          prefetch={false}
          href={`/corrections?page=${encodeURIComponent(path)}`}
          className="text-peacock font-semibold"
        >
          {t("page.somethingWrong")}
        </Link>
      </div>
    </>
  );
}

// "Help with seva" when the committee lets volunteers take slots here.
function SevaCard({ path, seva }: { path: string; seva: EventSeva }) {
  const shifts = seva.roles.flatMap((r) => (r.needs_dbs ? [] : r.shifts));
  if (!shifts.length) return null;
  const taken = shifts.reduce((n, s) => n + placesTaken(s), 0);
  const needed = shifts.reduce((n, s) => n + s.needed, 0);
  const t = pageT();
  return (
    <Card>
      <h2 className="text-2xl font-bold">{t("seva.help")}</h2>
      <p>
        <strong>{t("seva.takenOf", { taken, needed })}</strong>{" "}
        {t("seva.placesTaken")}
      </p>
      <Link href={path} className={`${quietButtonClass} self-start`}>
        {taken < needed ? t("seva.take") : t("seva.seeRota")}
      </Link>
    </Card>
  );
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
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: t("event.when"),
      value: event.recurrence ? (
        <>
          {rule ?? t("event.repeats")}
          <br />
          {t("event.next", {
            when: formatEventStart(event.next_starts_at, event.all_day),
          })}
        </>
      ) : (
        formatEventWhen(event.starts_at, event.ends_at, event.all_day)
      ),
    },
    {
      label: t("event.where"),
      value: (
        <>
          <Link
            href={localePath(`/mandirs/${mandir.slug}`)}
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
                {t("mandir.directions")}
              </a>
            </>
          )}
        </>
      ),
    },
  ];
  if (event.cost_note)
    rows.push({ label: t("event.cost"), value: event.cost_note });
  if (event.link) {
    rows.push({
      label: t("event.moreDetails"),
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
