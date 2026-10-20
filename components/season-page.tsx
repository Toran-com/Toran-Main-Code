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
import { festivalText, localePath, pageT, seasonText } from "@/lib/i18n/page";
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
// season's route renders this with its own words from lib/seasons.ts, in
// English or (at /gu/<slug>) Gujarati.

export function seasonMetadata(season: Season): Metadata {
  const { title, description } = seasonText(season);
  return pageMetadata(title, description, localePath(`/${season.slug}`));
}

export function SeasonPage({
  season,
  searchParams,
}: {
  season: Season;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const text = seasonText(season);
  return (
    <>
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}${localePath("/")}` },
          {
            name: text.name,
            url: `${siteUrl()}${localePath(`/${season.slug}`)}`,
          },
        ])}
      />
      <PageHeading title={text.title} intro={text.intro} />
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
  const t = pageT();
  const text = seasonText(season);
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
    return (
      <LoadProblem
        state={dates.state}
        what={t("season.loadDates", { name: text.name })}
      />
    );
  }
  const days = seasonDays(dates.data, season);
  const window = seasonWindow(days);
  if (!window) {
    return (
      <Notice>
        {t("season.notListed", { name: text.name })}{" "}
        <Link href={localePath("/festivals")} className="underline">
          {t("season.festivalDates")}
        </Link>
        {t("festival.appearAfter")}
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
            {t("season.isOn", {
              name: text.name,
              dates: formatDateRange(main.starts_on, main.ends_on),
            })}
          </h2>
          <Countdown date={main.starts_on} />
        </div>
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {days.map((d) => (
            <li key={d.slug}>
              <Link
                href={localePath(`/festivals/${d.slug}`)}
                className="hover:bg-sunk flex flex-col rounded-xl px-2 py-1.5 leading-snug no-underline"
              >
                <span className="font-semibold">
                  {festivalText(d.slug, { name: d.name, summary: null }).name}
                </span>
                <span className="text-marigold-ink">
                  {formatEventStart(`${d.starts_on}T12:00:00Z`, true)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {days.some((d) => !d.verified) && (
          <p className="text-muted text-base">
            <Badge tone="marigold">{t("festival.dateNotChecked")}</Badge>{" "}
            {t("season.otherCalendars")}
          </p>
        )}
      </section>

      <form className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4 sm:p-5">
        <NearMe
          page={localePath(`/${season.slug}`)}
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
        <LoadProblem state={events.state} what={t("load.eventList")} />
      ) : shown.length ? (
        <section aria-labelledby="events" className="flex flex-col gap-4">
          <h2
            id="events"
            className="font-display text-3xl leading-tight sm:text-4xl"
          >
            {t("festival.atMandirs", { name: text.name })}
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
            {t(position ? "season.noneNear" : "season.none", {
              name: text.name,
            })}
          </p>
          <p className="text-muted">
            {t("season.adding", { name: text.name })}{" "}
            <Link
              href={localePath("/mandirs")}
              className="text-peacock underline"
            >
              {t("festival.nearestMandir")}
            </Link>
            {t("festival.appearAfter")} {t("season.committee")}{" "}
            <Link href="/for-mandirs" className="text-peacock underline">
              {t("season.addProgramme")}
            </Link>
            {t("festival.appearAfter")}
          </p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}

      <SubscribeCalendar
        path={`/${season.slug}/calendar.ics`}
        title={t("season.calendarTitle", { name: text.name })}
        body={t("season.calendarBody", { name: text.name })}
      />
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{t("season.tellFamily")}</p>
        <ShareButtons
          label={t("season.share", { name: text.name })}
          text={text.shareText}
          path={localePath(`/${season.slug}`)}
        />
      </div>
    </>
  );
}
