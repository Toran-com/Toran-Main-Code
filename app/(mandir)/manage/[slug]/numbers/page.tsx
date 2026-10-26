import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Card,
  cardClass,
  Loading,
  Notice,
  PageShell,
  pillButtonClass,
} from "@/components/ui";
import { londonDate } from "@/lib/format";
import { requireMandirAccess } from "@/lib/manage-access";
import { eventPath } from "@/lib/share";
import { pageTitle } from "@/lib/site";
import {
  MANDIR_PERIODS as PERIODS,
  mandirNumbers,
  periodDays,
  readSummary,
} from "@/lib/stats";

// A committee's own numbers: how often its page and events were seen on
// Toran, added to calendars and shared. Toran's counter keeps only totals
// per page per day, with no cookies and nothing about who visited
// (decision 0015), so that's all there is to show.

export const metadata: Metadata = {
  title: pageTitle("Numbers"),
  robots: { index: false },
};

export default function NumbersPage(
  props: PageProps<"/manage/[slug]/numbers">,
) {
  return (
    <PageShell title="Numbers">
      <Suspense fallback={<Loading />}>
        <Numbers {...props} />
      </Suspense>
    </PageShell>
  );
}

async function Numbers({
  params,
  searchParams,
}: PageProps<"/manage/[slug]/numbers">) {
  const { slug } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/numbers`,
  );
  const query = await searchParams;
  const period =
    PERIODS.find((p) => String(p.days) === query.days) ?? PERIODS[1];
  const since = periodDays(londonDate(), period.days)[0];

  const { data, error } = await supabase.rpc("mandir_count_summary", {
    target: mandir.id,
    since,
  });
  const back = (
    <Link
      href={`/manage/${mandir.slug}`}
      className="text-peacock self-start font-semibold"
    >
      ← {mandir.name}
    </Link>
  );
  if (error) {
    return (
      <>
        {back}
        <Notice tone="error">
          We couldn&apos;t load your numbers just now. Please try again in a
          minute.
        </Notice>
      </>
    );
  }
  const numbers = mandirNumbers(readSummary(data), mandir.slug);

  // The events' names (only this mandir's).
  const ids = numbers.events.slice(0, 30).map((e) => e.id);
  const { data: events } = ids.length
    ? await supabase
        .from("events")
        .select("id, title")
        .eq("mandir_id", mandir.id)
        .in("id", ids)
    : { data: [] };
  const titles = new Map((events ?? []).map((e) => [e.id, e.title]));
  const listed = numbers.events.slice(0, 30).filter((e) => titles.has(e.id));

  return (
    <>
      <div className="flex flex-col gap-2">
        {back}
        <p className="text-muted">
          How often your page and events were seen on Toran, added to calendars
          and shared. Counted without cookies and with nothing about who
          visited, so these are totals only.
        </p>
      </div>

      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.days}
            href={`/manage/${mandir.slug}/numbers?days=${p.days}`}
            aria-current={p === period ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-base font-semibold ${
              p === period
                ? "border-peacock bg-peacock text-on-peacock"
                : "border-line hover:bg-sunk"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </nav>

      <dl className="grid grid-cols-2 gap-3">
        <Tile
          label="Views of your page and events"
          value={numbers.totals.view}
        />
        <Tile
          label="Events added to a calendar"
          value={numbers.totals.calendar}
        />
        <Tile
          label="Subscribed to your calendar"
          value={numbers.totals.subscribe}
        />
        <Tile label="Shared" value={numbers.totals.share} />
      </dl>

      <div className="flex flex-col items-start gap-2">
        <a
          href={`/manage/${mandir.slug}/numbers/export.csv?days=${period.days}`}
          download
          className={pillButtonClass}
        >
          Download as a spreadsheet
        </a>
        <p className="text-muted text-base">
          Your events from the {period.label.toLowerCase()} and everything
          coming up, with these numbers, as a file that Excel, Google Sheets or
          Numbers can open.
        </p>
      </div>

      <Card>
        <h2 className="text-xl font-bold sm:text-2xl">Your events</h2>
        <p className="text-muted">
          Your page itself was seen{" "}
          {numbers.pageViews === 1
            ? "once"
            : `${numbers.pageViews.toLocaleString("en-GB")} times`}
          .
        </p>
        {listed.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-line text-muted border-b">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Event
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 text-right font-semibold"
                  >
                    Views
                  </th>
                  <th
                    scope="col"
                    className="py-2 pr-3 text-right font-semibold"
                  >
                    Calendar
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Shared
                  </th>
                </tr>
              </thead>
              <tbody>
                {listed.map((e) => (
                  <tr key={e.id} className="border-line border-b last:border-0">
                    <td className="py-2 pr-3">
                      <Link
                        href={eventPath(mandir.slug, e.id)}
                        className="text-peacock underline"
                      >
                        {titles.get(e.id)}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {e.views.toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {e.calendar.toLocaleString("en-GB")}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {e.share.toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            None of your events have been seen yet in this period. Sharing an
            event&apos;s page on WhatsApp is the quickest way to change that.
          </p>
        )}
      </Card>
    </>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${cardClass} flex flex-col gap-1 p-4`}>
      <dt className="text-muted text-base">{label}</dt>
      <dd className="font-display text-4xl tabular-nums">
        {value.toLocaleString("en-GB")}
      </dd>
    </div>
  );
}
