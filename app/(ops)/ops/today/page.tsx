import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { FigureTable, FigureTile } from "@/components/ops-figures";
import { OpsNav } from "@/components/ops-nav";
import { Loading, Notice, PageShell } from "@/components/ui";
import { nightlyStatus } from "@/lib/attention";
import { requireToranAdmin } from "@/lib/auth";
import { londonToUtc } from "@/lib/format";
import { londonDate } from "@/lib/london";
import { daysBetween } from "@/lib/quick-events";
import { pageTitle } from "@/lib/site";
import { periodDays, readSummary, summarise } from "@/lib/stats";
import { createSessionClient } from "@/lib/supabase/session";

// Today at a glance, for busy weeks like Diwali: today's visits against
// yesterday's, what's been added, what's waiting, and whether the
// nightly job ran. Errors go to Sentry, which emails as they happen.

export const metadata: Metadata = {
  title: pageTitle("Today · Admin"),
  robots: { index: false },
};

export default function OpsTodayPage() {
  return (
    <PageShell title="Today" wide>
      <OpsNav current="/ops/today" />
      <Suspense fallback={<Loading />}>
        <Today />
      </Suspense>
    </PageShell>
  );
}

async function Today() {
  await requireToranAdmin("/ops/today");
  await connection();
  const [yesterday, today] = periodDays(londonDate(), 2);
  const since = (day: string) => londonToUtc(day, "00:00")!.toISOString();

  const supabase = await createSessionClient();
  if (!supabase) {
    return (
      <Notice tone="error">Couldn&apos;t load today&apos;s figures.</Notice>
    );
  }
  const [twoDays, todayOnly, added, slots, waiting, oldest, nightly] =
    await Promise.all([
      supabase.rpc("daily_count_summary", { since: yesterday }),
      supabase.rpc("daily_count_summary", { since: today }),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since(today)),
      supabase
        .from("seva_slots")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since(today)),
      supabase
        .from("event_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("event_claims")
        .select("created_at")
        .eq("status", "pending")
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("job_runs")
        .select("ran_at, summary")
        .eq("job", "nightly")
        .order("ran_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (twoDays.error || todayOnly.error) {
    return (
      <Notice tone="error">Couldn&apos;t load today&apos;s figures.</Notice>
    );
  }
  const now = summarise(readSummary(todayOnly.data), [today]);
  const before = summarise(readSummary(twoDays.data), [yesterday]).totals;
  const versus = (n: number) => `Yesterday: ${n.toLocaleString("en-GB")}`;

  const eventIds = now.byEvent.slice(0, 10).map((e) => e.path.split("/")[4]);
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .in("id", eventIds);
  const eventTitle = new Map((events ?? []).map((e) => [e.id, e.title]));

  const waitingDays = oldest.data
    ? daysBetween(londonDate(new Date(oldest.data.created_at)), today)
    : 0;
  const job = nightlyStatus(nightly.data ?? null);
  const lastRun = job.state === "never" ? null : new Date(job.ranAt);

  return (
    <>
      <AutoRefresh seconds={60} />
      {job.state !== "ok" && (
        <Notice tone="error">
          {job.state === "never"
            ? "The nightly job hasn't run yet."
            : "The nightly job hasn't run for over a day and a half."}{" "}
          See{" "}
          <Link href="/ops/attention" className="underline">
            Needs attention
          </Link>
          .
        </Notice>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <FigureTile
          label="Page views today"
          value={now.totals.view}
          note={versus(before.view)}
        />
        <FigureTile
          label="Added to calendar"
          value={now.totals.calendar + now.totals.subscribe}
          note={versus(before.calendar + before.subscribe)}
        />
        <FigureTile
          label="Shared"
          value={now.totals.share}
          note={versus(before.share)}
        />
        <FigureTile label="Seva slots taken" value={slots.count ?? 0} />
        <FigureTile label="Events added today" value={added.count ?? 0} />
        <FigureTile
          label="Waiting for review"
          value={waiting.count ?? 0}
          note={
            waiting.count
              ? `Oldest: ${waitingDays === 0 ? "today" : `${waitingDays} ${waitingDays === 1 ? "day" : "days"}`}`
              : undefined
          }
        />
      </dl>
      <p className="text-muted">
        {job.state === "ok" &&
          lastRun &&
          `Nightly job last ran ${lastRun.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit" })}. `}
        <Link href="/ops/posters" className="text-peacock underline">
          Open the review queue
        </Link>
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <FigureTable
          title="Busiest pages today"
          head={["Page", "Views"]}
          rows={now.byKind.slice(0, 10).map((k) => [k.kind, k.views])}
          empty="No visits counted yet today."
        />
        <FigureTable
          title="Most viewed events today"
          head={["Event", "Views"]}
          rows={now.byEvent.slice(0, 10).map((e) => [
            <Link key={e.path} href={e.path} className="text-peacock underline">
              {eventTitle.get(e.path.split("/")[4]) ?? e.path}
            </Link>,
            e.views,
          ])}
          empty="No event pages counted yet today."
        />
      </div>
    </>
  );
}
