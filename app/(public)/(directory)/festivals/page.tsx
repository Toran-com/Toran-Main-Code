import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DateTile } from "@/components/date-tile";
import { Toran } from "@/components/ornaments";
import { Badge, LoadProblem, PageHeading } from "@/components/public-shell";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { Loading, Notice } from "@/components/ui";
import { listFestivalDates, type FestivalDate } from "@/lib/directory";
import { calendarLabel, formatDateRange, monthOf } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { seasonDays } from "@/lib/festival-season";
import { SEASONS } from "@/lib/seasons";
import { festivalText, localePath, pageT, seasonText } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("shell.festivals"),
    t("festivals.description"),
    localePath("/festivals"),
  );
}

export default function FestivalsPage() {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-10 sm:gap-14">
      <PageHeading title={t("shell.festivals")} intro={t("festivals.intro")} />
      <Suspense fallback={<Loading />}>
        <Festivals />
      </Suspense>
    </div>
  );
}

async function Festivals() {
  const t = pageT();
  const result = await listFestivalDates();
  // Offered even when the dates can't be shown here.
  const subscribe = (
    <SubscribeCalendar
      path="/festivals/calendar.ics"
      title={t("festivals.calendarTitle")}
      body={t("festivals.calendarBody")}
    />
  );
  if (result.state !== "ok" || result.data.length === 0) {
    return (
      <>
        {result.state !== "ok" ? (
          <LoadProblem state={result.state} what={t("load.festivalDates")} />
        ) : (
          <Notice>{t("festivals.none")}</Notice>
        )}
        {subscribe}
      </>
    );
  }

  // The festival seasons with a page of their own, soonest first. The
  // dates already start from today (listFestivalDates), so no "today" is
  // needed and the page stays static.
  const seasons = SEASONS.flatMap((season) => {
    const main = seasonDays(result.data, season, "").find(
      (d) => d.slug === season.main,
    );
    return main ? [{ season, main }] : [];
  }).sort((a, b) => a.main.starts_on.localeCompare(b.main.starts_on));

  const months = new Map<string, FestivalDate[]>();
  for (const date of result.data) {
    const month = monthOf(date.starts_on);
    months.set(month, [...(months.get(month) ?? []), date]);
  }

  return (
    <>
      {seasons.length > 0 && (
        <section
          aria-labelledby="seasons"
          className="own-toran bg-night text-on-night relative overflow-hidden rounded-[2rem]"
        >
          <Toran night />
          <div
            aria-hidden="true"
            className="rangoli-art rangoli-art-night pointer-events-none absolute -top-16 -right-24 size-[26rem] opacity-10 sm:opacity-20"
          />
          <div className="relative flex flex-col gap-4 px-5 pt-2 pb-8 sm:px-10 sm:pb-10">
            <h2
              id="seasons"
              className="font-display text-4xl leading-tight sm:text-5xl"
            >
              {t("festivals.seasons")}
            </h2>
            <p className="text-night-muted max-w-prose">
              {t("festivals.seasonsIntro")}
            </p>
            <ul className="grid gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              {seasons.map(({ season, main }) => (
                <li key={season.slug}>
                  <Link
                    href={localePath(`/${season.slug}`)}
                    className="bg-on-night/5 hover:bg-on-night/10 text-on-night flex flex-col rounded-2xl px-5 py-4 no-underline transition-colors"
                  >
                    <span className="text-lg font-semibold">
                      {t("festival.atMandirs", {
                        name: seasonText(season).name,
                      })}{" "}
                      <span aria-hidden="true" className="text-night-accent">
                        →
                      </span>
                    </span>
                    <span className="text-night-muted">
                      {formatDateRange(main.starts_on, main.ends_on)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
        <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-10">
          {[...months.entries()].map(([month, dates]) => (
            <section key={month} className="flex flex-col">
              <h2 className="font-display mb-1 text-4xl leading-tight sm:text-5xl">
                {month}
              </h2>
              <ul className="divide-line flex flex-col divide-y">
                {dates.map((date) => (
                  <li key={date.id}>
                    <FestivalCard date={date} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col lg:sticky lg:top-28">
          {subscribe}
        </aside>
      </div>
    </>
  );
}

function FestivalCard({ date }: { date: FestivalDate }) {
  const t = pageT();
  const calendar = calendarLabel(date.calendar);
  const festival = date.festival && {
    slug: date.festival.slug,
    ...festivalText(date.festival.slug, date.festival),
  };
  return (
    <article className="has-card-link group flex gap-4 py-5 sm:gap-6">
      <DateTile
        date={date.starts_on}
        label={formatDateRange(date.starts_on, date.ends_on)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-xl leading-snug font-semibold">
          {festival ? (
            <Link
              href={localePath(`/festivals/${festival.slug}`)}
              className="card-link group-hover:text-peacock no-underline"
            >
              {festival.name}
            </Link>
          ) : (
            t("kind.festival")
          )}
        </h3>
        <p className="text-muted">
          {formatDateRange(date.starts_on, date.ends_on)}
          {calendar && ` · ${calendar}`}
        </p>
        {festival?.summary && <p>{festival.summary}</p>}
        {!date.verified && (
          <p className="pt-1">
            <Badge tone="marigold">{t("festival.dateNotChecked")}</Badge>
          </p>
        )}
      </div>
    </article>
  );
}
