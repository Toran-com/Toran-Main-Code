import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading, Notice } from "@/components/ui";
import { listFestivalDates, type FestivalDate } from "@/lib/directory";
import { calendarLabel, formatDateRange, monthOf } from "@/lib/format";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Festivals"),
  description:
    "Dates of Navratri, Diwali, Holi and other Hindu festivals in the UK.",
};

export default function FestivalsPage() {
  return (
    <>
      <PageHeading
        title="Festivals"
        intro="Dates for the UK. A few festivals fall on different days depending on the calendar a mandir follows, so check with your mandir too."
      />
      <Suspense fallback={<Loading />}>
        <Festivals />
      </Suspense>
    </>
  );
}

async function Festivals() {
  const result = await listFestivalDates();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what="festival dates" />;
  }
  if (result.data.length === 0) {
    return <Notice>No festival dates are listed yet.</Notice>;
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
          <h2 className="font-display text-3xl font-bold">{month}</h2>
          <ul className="flex flex-col gap-3">
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
  const calendar = calendarLabel(date.calendar);
  return (
    <article className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-5">
      <p className="text-marigold-ink font-semibold">
        {formatDateRange(date.starts_on, date.ends_on)}
      </p>
      <h3 className="text-xl font-bold">{date.festival?.name ?? "Festival"}</h3>
      {calendar && <p className="text-muted -mt-2">{calendar}</p>}
      {date.festival?.summary && <p>{date.festival.summary}</p>}
      {!date.verified && (
        <p>
          <Badge tone="marigold">Date not yet checked</Badge>
        </p>
      )}
    </article>
  );
}
