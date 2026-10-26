import type { NextRequest } from "next/server";
import { exportRows, toCsv } from "@/lib/committee-export";
import { londonDate } from "@/lib/london";
import { requireMandirAccess } from "@/lib/manage-access";
import {
  MANDIR_PERIODS,
  mandirNumbers,
  periodDays,
  readSummary,
} from "@/lib/stats";

// "Download as a spreadsheet" on a committee's Numbers page: its events
// and their numbers for the chosen period, as a CSV file.

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/manage/[slug]/numbers/export.csv">,
) {
  const { slug } = await params;
  const { supabase, mandir } = await requireMandirAccess(
    slug,
    `/manage/${slug}/numbers`,
  );
  const asked = request.nextUrl.searchParams.get("days");
  const days = MANDIR_PERIODS.find((p) => String(p.days) === asked)?.days ?? 28;
  const today = londonDate();
  const since = periodDays(today, days)[0];

  const [summary, events] = await Promise.all([
    supabase.rpc("mandir_count_summary", { target: mandir.id, since }),
    supabase
      .from("events")
      .select(
        "id, title, title_gu, kind, starts_at, ends_at, all_day, recurrence, status, seva_open",
      )
      .eq("mandir_id", mandir.id)
      .neq("status", "removed")
      .order("starts_at"),
  ]);
  if (summary.error || events.error) {
    return new Response(
      "We couldn't make the file just now. Please try again in a minute.",
      {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }

  const rows = exportRows({
    events: events.data ?? [],
    numbers: mandirNumbers(readSummary(summary.data), mandir.slug),
    since,
    slug: mandir.slug,
    origin: request.nextUrl.origin,
  });
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="toran-${mandir.slug}-${since}-to-${today}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
