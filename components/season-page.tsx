import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Countdown } from "@/components/countdown";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { NearMe } from "@/components/near-me";
import { Badge, LoadProblem, PageHeading } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { listFestivalDates } from "@/lib/directory";
import { seasonDays, seasonEvents, seasonWindow } from "@/lib/festival-season";
import { formatDateRange, formatEventStart } from "@/lib/format";
import { translator } from "@/lib/i18n";
import type { Season } from "@/lib/seasons";
import { pageMetadata, siteUrl } from "@/lib/site";
import { breadcrumbData } from "@/lib/structured-data";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import {
  nearestFirstEachDay,
  nearTo,
  RADII,
  radiusFrom,
} from "@/lib/whats-on-view";

// A festival season's page (/diwali, /holi and so on): the festival days,
// and every mandir's events across them, near you if you like. Each
// season's route renders this with its own words from lib/seasons.ts.

export function seasonMetadata(season: Season): Metadata {
  return pageMetadata(season.title, season.description, `/${season.slug}`);
}

export function SeasonPage({
  season,
  searchParams,
}: {
  season: Season;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: season.name, url: `${siteUrl()}/${season.slug}` },
        ])}
      />
      <PageHeading title={season.title} intro={season.intro} />
      <Suspense fallback={<Loading />}>
        <SeasonBody season={season} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SeasonBody({
  season,
  searchParams,
}: {
  season: Season;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = translator();
  const query = await searchParams;
  // Says "Today" and "Tomorrow", so worked out per visit.
  await connection();
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);

  const [dates, events, origin] = await Promise.all([
    listFestivalDates(),
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);
  if (dates.state !== "ok") {
    return <LoadProblem state={dates.state} what={`${season.name} dates`} />;
  }
  const days = seasonDays(dates.data, season);
  const window = seasonWindow(days);
  if (!window) {
    return (
      <Notice>
        Next year&apos;s {season.name} dates aren&apos;t listed yet. See all the{" "}
        <Link href="/festivals" className="underline">
          festival dates
        </Link>
        .
      </Notice>
    );
  }
  const main = days.find((d) => d.slug === season.main)!;

  let problem: string | null = null;
  let position = null;
  if (near && origin === "unavailable") {
    problem = t("whatsOn.lookupFailed");
  } else if (near && !origin) {
    problem = t("whatsOn.notFound", { place: near });
  } else if (origin && origin !== "unavailable") {
    position = origin;
  }
  const during =
    events.state === "ok" ? seasonEvents(events.data, season, window) : [];
  const nearby = nearTo(during, position, within);
  const shown = position ? nearestFirstEachDay(nearby) : nearby;

  return (
    <>
      <section
        aria-labelledby="days"
        className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="days" className="font-display text-xl font-bold">
            {season.name} is on {formatDateRange(main.starts_on, main.ends_on)}
          </h2>
          <Countdown date={main.starts_on} />
        </div>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {days.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/festivals/${d.slug}`}
                className="hover:bg-sunk flex flex-col rounded-xl px-2 py-1.5 leading-snug no-underline"
              >
                <span className="font-semibold">{d.name}</span>
                <span className="text-marigold-ink">
                  {formatEventStart(`${d.starts_on}T12:00:00Z`, true)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {days.some((d) => !d.verified) && (
          <p className="text-muted text-base">
            <Badge tone="marigold">{t("festival.dateNotChecked")}</Badge> Some
            mandirs follow a different calendar, so check with yours.
          </p>
        )}
      </section>

      <form className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4 sm:p-5">
        <NearMe
          page={`/${season.slug}`}
          labels={{
            field: t("whatsOn.near"),
            button: t("whatsOn.nearMe"),
            finding: t("whatsOn.finding"),
            denied: t("whatsOn.locationDenied"),
            failed: t("whatsOn.locationFailed"),
          }}
          input={
            <input
              id="near"
              name="near"
              defaultValue={near}
              placeholder={t("whatsOn.nearExample")}
              autoComplete="postal-code"
              className={inputClass}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="font-semibold">{t("whatsOn.within")}</span>
            <select
              name="within"
              defaultValue={String(within)}
              className={`${inputClass} w-auto py-2`}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {t("whatsOn.miles", { miles: r })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={`${buttonClass} flex-1 basis-32 py-2 sm:max-w-48`}
          >
            {t("whatsOn.show")}
          </button>
        </div>
      </form>

      {problem && <Notice tone="error">{problem}</Notice>}
      {events.state !== "ok" ? (
        <LoadProblem state={events.state} what="event list" />
      ) : shown.length ? (
        <section aria-labelledby="events" className="flex flex-col gap-4">
          <h2
            id="events"
            className="font-display text-2xl font-bold sm:text-3xl"
          >
            {season.name} at mandirs
          </h2>
          <p className="text-muted" aria-live="polite">
            {t.count("whatsOn.count", shown.length)}
            {position &&
              t("whatsOn.countNear", {
                miles: within,
                place: near.toUpperCase(),
              })}
            {position && t("whatsOn.nearestFirst")}
          </p>
          <EventList events={shown} now={new Date()} />
        </section>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-2xl p-5">
          <p className="font-semibold">
            {position
              ? `No ${season.name} events listed near there yet.`
              : `No ${season.name} events listed yet.`}
          </p>
          <p className="text-muted">
            Mandirs are adding their {season.name} programmes. Check back soon,
            or find your{" "}
            <Link href="/mandirs" className="text-peacock underline">
              nearest mandir
            </Link>
            . On a mandir committee?{" "}
            <Link href="/for-mandirs" className="text-peacock underline">
              Add your programme in a few minutes
            </Link>
            .
          </p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}

      <SubscribeCalendar
        path={`/${season.slug}/calendar.ics`}
        title={`Put ${season.name} events in your calendar`}
        body={`Every mandir's ${season.name} events in the calendar on your phone. New events and changes appear there automatically.`}
      />
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Tell family and friends</p>
        <ShareButtons
          label={`Share the ${season.name} page`}
          text={season.shareText}
          path={`/${season.slug}`}
        />
      </div>
    </>
  );
}
