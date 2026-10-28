import type { Metadata } from "next";
import { Suspense } from "react";
import { OpsNav } from "@/components/ops-nav";
import { Badge } from "@/components/public-shell";
import {
  inputClass,
  Loading,
  Notice,
  PageShell,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { calendarLabel, formatDateRange } from "@/lib/format";
import { pageTitle } from "@/lib/site";
import { createSessionClient } from "@/lib/supabase/session";
import { setFestivalDateChecked } from "./actions";

export const metadata: Metadata = {
  title: pageTitle("Festival dates · Admin"),
  robots: { index: false },
};

export default function OpsFestivalsPage(props: PageProps<"/ops/festivals">) {
  return (
    <PageShell title="Festival dates" wide>
      <OpsNav current="/ops/festivals" />
      <Suspense fallback={<Loading />}>
        <FestivalDates {...props} />
      </Suspense>
    </PageShell>
  );
}

async function FestivalDates({ searchParams }: PageProps<"/ops/festivals">) {
  await requireToranAdmin("/ops/festivals");
  const supabase = await createSessionClient();
  const { data: dates } = supabase
    ? await supabase
        .from("festival_dates")
        .select(
          "id, calendar, starts_on, ends_on, verified, source, festival:festivals (name)",
        )
        .order("starts_on")
    : { data: [] };
  const query = await searchParams;

  return (
    <>
      <p className="text-muted">
        Check each date against a published panchang for London, then mark it
        checked and say where you checked it. Checked dates lose the &ldquo;Date
        may vary: check with your mandir&rdquo; label on the public site.
      </p>
      {query.error === "source" && (
        <Notice tone="error">
          Please say where you checked the date (for example &ldquo;Drik
          Panchang, London&rdquo;).
        </Notice>
      )}
      {query.error === "failed" && (
        <Notice tone="error">Something went wrong. Please try again.</Notice>
      )}
      {query.saved && (
        <Notice tone="success">
          Marked as {query.saved === "checked" ? "checked" : "not checked"}.
        </Notice>
      )}
      <ul className="flex flex-col gap-3">
        {(dates ?? []).map((d) => (
          <li
            key={d.id}
            className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-bold">
                {d.festival?.name ?? "Festival"}
              </span>
              {calendarLabel(d.calendar) && (
                <span className="text-muted">{calendarLabel(d.calendar)}</span>
              )}
              {d.verified ? (
                <Badge tone="peacock">Checked</Badge>
              ) : (
                <Badge tone="marigold">Not yet checked</Badge>
              )}
            </div>
            <p className="text-marigold-ink font-semibold">
              {formatDateRange(d.starts_on, d.ends_on)}
            </p>
            <form
              action={setFestivalDateChecked}
              className="flex flex-col gap-2"
            >
              <input type="hidden" name="id" value={d.id} />
              {d.verified ? (
                <>
                  <p className="text-muted text-base">Source: {d.source}</p>
                  <input type="hidden" name="verified" value="no" />
                  <button
                    type="submit"
                    className={`${quietButtonClass} self-start px-4 py-2 text-base`}
                  >
                    Mark as not checked
                  </button>
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-base font-semibold">
                      Where you checked it
                    </span>
                    <input
                      name="source"
                      required
                      minLength={3}
                      maxLength={300}
                      placeholder="e.g. Drik Panchang, London"
                      className={inputClass}
                    />
                  </label>
                  <input type="hidden" name="verified" value="yes" />
                  <button
                    type="submit"
                    className={`${quietButtonClass} self-start px-4 py-2 text-base`}
                  >
                    Mark as checked
                  </button>
                </>
              )}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
