import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AreaChips, regionName } from "@/components/area-chips";
import { Countdown } from "@/components/countdown";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { DateTile } from "@/components/date-tile";
import { Toran } from "@/components/ornaments";
import { PlacePicker } from "@/components/place-picker";
import { LoadProblem } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { Loading, Notice } from "@/components/ui";
import { listFestivalDates } from "@/lib/directory";
import { seasonDays, seasonEvents, seasonWindow } from "@/lib/festival-season";
import { formatDateRange, formatEventStart } from "@/lib/format";
import { festivalText, localePath, pageT, seasonText } from "@/lib/i18n/page";
import type { Season } from "@/lib/seasons";
import { pageMetadata, siteUrl } from "@/lib/site";
import { breadcrumbData } from "@/lib/structured-data";
import { townCounts } from "@/lib/towns";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import {
  dayFrom,
  LONG_LIST,
  longDayHeading,
  nearestFirstEachDay,
  nearTo,
  onDay,
  PER_DAY,
  RADII,
  radiusFrom,
  regionCounts,
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
  // Full width from laptop size up: the events, with the towns, calendar
  // and sharing in a column beside them.
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}${localePath("/")}` },
          {
            name: text.name,
            url: `${siteUrl()}${localePath(`/${season.slug}`)}`,
          },
        ])}
      />
      {/* The page's bold moment: the season and its days under a toran. */}
      <header className="own-toran bg-night text-on-night rise relative overflow-hidden rounded-[2rem]">
        <Toran night />
        <div
          aria-hidden="true"
          className="rangoli-art rangoli-art-night pointer-events-none absolute -top-10 -right-28 size-[24rem] opacity-10 sm:size-[30rem] sm:opacity-20"
        />
        <div className="relative flex flex-col gap-4 px-5 pt-2 pb-8 sm:px-10 sm:pb-10">
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            {text.title}
          </h1>
          <p className="text-night-muted max-w-prose text-lg leading-relaxed">
            {text.intro}
          </p>
          <Suspense fallback={null}>
            <SeasonDays season={season} />
          </Suspense>
        </div>
      </header>
      <Suspense fallback={<Loading />}>
        <SeasonBody season={season} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// The festival days of the season, inside the heading: each with its date
// tile and a link to the festival's own page.
export async function SeasonDays({ season }: { season: Season }) {
  const t = pageT();
  const text = seasonText(season);
  const dates = await listFestivalDates();
  if (dates.state !== "ok") return null;
  // The dates already start from today (listFestivalDates), so no "today"
  // is needed and the heading can be saved with the page.
  const days = seasonDays(dates.data, season, "");
  if (!seasonWindow(days)) return null;
  const main = days.find((d) => d.slug === season.main)!;
  return (
    <section aria-labelledby="days" className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="days" className="text-xl font-semibold sm:text-2xl">
          {t("season.isOn", {
            name: text.name,
            dates: formatDateRange(main.starts_on, main.ends_on),
          })}
        </h2>
        <Countdown date={main.starts_on} night />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {days.map((d) => (
          <li
            key={d.slug}
            className="has-card-link group bg-on-night/5 hover:bg-on-night/10 flex items-center gap-4 rounded-2xl p-2.5 transition-colors"
          >
            {/* Not fetched ahead: four festival pages would cost visitors
                on mobile data more than the wait saves. */}
            <Link
              href={localePath(`/festivals/${d.slug}`)}
              prefetch={false}
              className="card-link order-2 flex flex-col leading-snug no-underline"
            >
              <span className="text-on-night font-semibold">
                {festivalText(d.slug, { name: d.name, summary: null }).name}
              </span>
              <span className="text-night-muted">
                {formatEventStart(`${d.starts_on}T12:00:00Z`, true)}
              </span>
            </Link>
            <span className="order-1">
              <DateTile
                date={d.starts_on}
                label={formatDateRange(d.starts_on, d.ends_on)}
                size="sm"
                night
              />
            </span>
          </li>
        ))}
      </ul>
      {days.some((d) => !d.verified) && (
        <p className="text-night-muted text-base">
          <span className="bg-night-accent/15 text-night-accent rounded-full px-3 py-0.5 font-semibold">
            {t("festival.dateNotChecked")}
          </span>
        </p>
      )}
    </section>
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
  const region = String(query.region ?? "").slice(0, 80);
  const day = dayFrom(query.day);
  // Links that change one choice and keep the others.
  const here = (change: { region?: string; day?: string }) => {
    const params = new URLSearchParams();
    if (near) params.set("near", near);
    if (within !== 15) params.set("within", String(within));
    const r = change.region ?? region;
    const d = change.day ?? day;
    if (r) params.set("region", r);
    if (d) params.set("day", d);
    const q = params.toString();
    return `${localePath(`/${season.slug}`)}${q ? `?${q}` : ""}#events`;
  };

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
  const inRegion = region
    ? during.filter((e) => e.mandir.region === region)
    : during;
  const nearby = nearTo(onDay(inRegion, day), position, within);
  const shown = position ? nearestFirstEachDay(nearby) : nearby;
  // Choosing an area helps most when nothing narrows the list yet.
  const areas = position ? [] : regionCounts(onDay(during, day));
  const long = !position && !region && !day && shown.length > LONG_LIST;
  // Each town's own page for the season (/diwali/leicester).
  const towns = townCounts(during);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-12">
      <div className="flex min-w-0 flex-col gap-6 sm:gap-8">
        <PlacePicker
          page={localePath(`/${season.slug}`)}
          near={near}
          within={within}
          radii={RADII}
          status={
            !near
              ? "none"
              : origin === "unavailable"
                ? "unavailable"
                : origin
                  ? "found"
                  : "unknown"
          }
          region={region}
          keep={day ? `day=${day}` : ""}
          pick={query.pick === "1"}
        />

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
              {region &&
                t("whatsOn.countRegion", { region: regionName(region) })}
              {day && t("whatsOn.onDay", { day: longDayHeading(day) })}
              {position && t("whatsOn.nearestFirst")}
              {day && (
                <>
                  {" · "}
                  <Link
                    href={here({ day: "" })}
                    className="text-peacock underline"
                  >
                    {t("whatsOn.everyDay")}
                  </Link>
                </>
              )}
            </p>
            <AreaChips
              areas={areas}
              total={onDay(during, day).length}
              chosen={region}
              href={(r) => here({ region: r })}
            />
            <EventList
              events={shown}
              now={new Date()}
              more={
                long
                  ? { perDay: PER_DAY, href: (d) => here({ day: d }) }
                  : undefined
              }
            />
          </section>
        ) : (
          <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
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
      </div>

      <aside className="flex flex-col gap-6 sm:gap-8">
        {towns.length > 0 && (
          <nav aria-labelledby="by-town" className="flex flex-col gap-3">
            <h2 id="by-town" className="text-xl font-semibold sm:text-2xl">
              {t("season.byTown", { name: text.name })}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {towns.map((town) => (
                <li key={town.slug}>
                  <Link
                    href={localePath(`/${season.slug}/${town.slug}`)}
                    prefetch={false}
                    className="border-line-strong bg-surface text-ink hover:border-peacock/60 inline-flex items-baseline gap-2 rounded-full border px-4 py-1.5 text-base font-medium no-underline"
                  >
                    {town.town}
                    <span className="text-muted tabular-nums">
                      {town.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

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
      </aside>
    </div>
  );
}
