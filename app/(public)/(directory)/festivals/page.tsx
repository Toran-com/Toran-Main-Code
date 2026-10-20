import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
    <>
      <PageHeading title={t("shell.festivals")} intro={t("festivals.intro")} />
      <SubscribeCalendar
        path="/festivals/calendar.ics"
        title={t("festivals.calendarTitle")}
        body={t("festivals.calendarBody")}
      />
      <Suspense fallback={<Loading />}>
        <Festivals />
      </Suspense>
    </>
  );
}

async function Festivals() {
  const t = pageT();
  const result = await listFestivalDates();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what={t("load.festivalDates")} />;
  }
  if (result.data.length === 0) {
    return <Notice>{t("festivals.none")}</Notice>;
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
    <div className="flex flex-col gap-8">
      {seasons.length > 0 && (
        <section aria-labelledby="seasons" className="flex flex-col gap-3">
          <h2
            id="seasons"
            className="font-display text-2xl font-bold sm:text-3xl"
          >
            {t("festivals.seasons")}
          </h2>
          <p className="text-muted">{t("festivals.seasonsIntro")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {seasons.map(({ season, main }) => (
              <li key={season.slug}>
                <Link
                  href={localePath(`/${season.slug}`)}
                  className="border-line bg-surface lift hover:border-marigold/60 flex flex-col rounded-2xl border px-4 py-3 no-underline"
                >
                  <span className="text-ink font-bold">
                    {t("festival.atMandirs", {
                      name: seasonText(season).name,
                    })}{" "}
                    <span aria-hidden="true" className="text-peacock">
                      →
                    </span>
                  </span>
                  <span className="text-marigold-ink">
                    {formatDateRange(main.starts_on, main.ends_on)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {[...months.entries()].map(([month, dates]) => (
        <section key={month} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            {month}
          </h2>
          <ul className="rise-list flex flex-col gap-3">
            {dates.map((date) => (
              <li key={date.id}>
                <FestivalCard date={date} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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
    <article className="has-card-link group border-line bg-surface lift shadow-card flex flex-col gap-1 rounded-2xl border p-4 sm:p-5">
      <p className="text-marigold-ink font-semibold">
        {formatDateRange(date.starts_on, date.ends_on)}
      </p>
      <h3 className="text-xl font-bold">
        {festival ? (
          <>
            <Link
              href={localePath(`/festivals/${festival.slug}`)}
              className="card-link group-hover:text-peacock no-underline"
            >
              {festival.name}
            </Link>
            <span aria-hidden="true" className="text-peacock">
              {"\u00a0→"}
            </span>
          </>
        ) : (
          t("kind.festival")
        )}
      </h3>
      {calendar && <p className="text-muted">{calendar}</p>}
      {festival?.summary && <p className="text-muted">{festival.summary}</p>}
      {!date.verified && (
        <p>
          <Badge tone="marigold">{t("festival.dateNotChecked")}</Badge>
        </p>
      )}
    </article>
  );
}
