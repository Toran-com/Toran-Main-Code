import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, LoadProblem, PageHeading } from "@/components/public-shell";
import { SubscribeCalendar } from "@/components/subscribe-calendar";
import { Loading, Notice } from "@/components/ui";
import { listFestivalDates, type FestivalDate } from "@/lib/directory";
import { calendarLabel, formatDateRange, monthOf } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { festivalText, localePath, pageT } from "@/lib/i18n/page";

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

  const months = new Map<string, FestivalDate[]>();
  for (const date of result.data) {
    const month = monthOf(date.starts_on);
    months.set(month, [...(months.get(month) ?? []), date]);
  }

  return (
    <div className="flex flex-col gap-8">
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
