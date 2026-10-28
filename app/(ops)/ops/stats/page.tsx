import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  FigureTable as Table,
  FigureTile as Tile,
} from "@/components/ops-figures";
import { OpsNav } from "@/components/ops-nav";
import { Loading, Notice } from "@/components/ui";
import { PageShell } from "@/components/page-shell";
import { requireToranAdmin } from "@/lib/auth";
import { londonDate } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { periodDays, readSummary, summarise } from "@/lib/stats";
import { createSessionClient } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: pageTitle("Stats · Admin"),
  robots: { index: false },
};

const PERIODS = [7, 30, 90] as const;

export default function OpsStatsPage(props: PageProps<"/ops/stats">) {
  return (
    <PageShell title="Stats" wide>
      <OpsNav current="/ops/stats" />
      <Suspense fallback={<Loading />}>
        <Stats {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Stats({ searchParams }: PageProps<"/ops/stats">) {
  await requireToranAdmin("/ops/stats");
  const query = await searchParams;
  const days = PERIODS.find((d) => String(d) === query.days) ?? 30;
  const period = periodDays(londonDate(), days);
  const from = period[0];

  const supabase = await createSessionClient();
  const [counts, slots] = supabase
    ? await Promise.all([
        supabase.rpc("daily_count_summary", { since: from }),
        supabase
          .from("seva_slots")
          .select("id", { count: "exact", head: true })
          .gte("created_at", `${from}T00:00:00Z`),
      ])
    : [null, null];
  if (!counts || counts.error) {
    return <Notice tone="error">Couldn&apos;t load the counts.</Notice>;
  }
  const stats = summarise(readSummary(counts.data), period);

  // Names for the mandirs and events in the tables.
  const slugs = stats.byMandir.slice(0, 50).map((m) => m.slug);
  const eventIds = stats.byEvent.slice(0, 20).map((e) => e.path.split("/")[4]);
  const [{ data: mandirs }, { data: events }] = await Promise.all([
    supabase!.from("mandirs").select("slug, name, town").in("slug", slugs),
    supabase!.from("events").select("id, title").in("id", eventIds),
  ]);
  const mandirName = new Map(
    (mandirs ?? []).map((m) => [m.slug, `${m.name}, ${m.town}`]),
  );
  const eventTitle = new Map((events ?? []).map((e) => [e.id, e.title]));

  return (
    <>
      <p className="text-muted">
        Toran&apos;s own counter: page views, and how often events were added to
        calendars or shared. No cookies and nothing about visitors, only totals
        per page per day. Browsers that ask not to be tracked, search engines
        and link previews aren&apos;t counted, so real numbers are a little
        higher.
      </p>

      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map((d) => (
          <Link
            key={d}
            href={`/ops/stats?days=${d}`}
            aria-current={d === days ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-base font-semibold ${
              d === days
                ? "border-peacock bg-peacock text-on-peacock"
                : "border-line hover:bg-sunk"
            }`}
          >
            Last {d} days
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Page views" value={stats.totals.view} />
        <Tile label="Added to calendar" value={stats.totals.calendar} />
        <Tile label="Calendars subscribed" value={stats.totals.subscribe} />
        <Tile label="Shared" value={stats.totals.share} />
        <Tile label="Seva slots taken" value={slots?.count ?? 0} />
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <Table
          title="Views by page"
          head={["Page", "Views"]}
          rows={stats.byKind.map((k) => [k.kind, k.views])}
          empty="No visits counted yet."
        />
        <Table
          title="Views each day"
          head={["Day", "Views"]}
          rows={[...stats.byDay]
            .reverse()
            .map((d) => [dayLabel(d.day), d.views])}
          empty="No days yet."
        />
      </div>

      <Table
        title="Mandirs (their page and events)"
        head={["Mandir", "Views", "Calendar", "Subscribed", "Shared"]}
        rows={stats.byMandir.slice(0, 50).map((m) => [
          <Link
            key={m.slug}
            href={`/mandirs/${m.slug}`}
            className="text-peacock underline"
          >
            {mandirName.get(m.slug) ?? m.slug}
          </Link>,
          m.views,
          m.calendar,
          m.subscribe,
          m.share,
        ])}
        empty="No mandir pages counted yet."
      />

      <Table
        title="Most viewed events"
        head={["Event", "Views"]}
        rows={stats.byEvent.slice(0, 20).map((e) => [
          <Link key={e.path} href={e.path} className="text-peacock underline">
            {eventTitle.get(e.path.split("/")[4]) ?? e.path}
          </Link>,
          e.views,
        ])}
        empty="No event pages counted yet."
      />
    </>
  );
}

// "Sun 18 Oct"
function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${day}T00:00:00Z`))
    .replace(",", "");
}
