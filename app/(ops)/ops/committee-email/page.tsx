import type { Metadata } from "next";
import { Suspense } from "react";
import { CopyText } from "@/components/copy-text";
import { OpsPage } from "@/components/ops-page";
import {
  Card,
  inputClass,
  Loading,
  Notice,
  quietButtonClass,
} from "@/components/ui";
import { requireToranAdmin } from "@/lib/auth";
import { loadCommitteeFacts } from "@/lib/committee-facts";
import { committeeMonthly, MONTHLY_DAYS } from "@/lib/committee-monthly";
import { committeeTasks } from "@/lib/committee-tasks";
import { londonDate } from "@/lib/london";
import { pageTitle, siteUrl } from "@/lib/site";
import { mandirNumbers, periodDays, readSummary } from "@/lib/stats";
import { createSessionClient } from "@/lib/supabase/session";

// A preview of the monthly email to each mandir's committee: how its page
// did, what's coming up and anything to do. Nothing sends it, here or
// anywhere: emails to committees wait for the ICO registration and DPIA
// (decision 0006). Toran admins only.

export const metadata: Metadata = {
  title: pageTitle("Committee email · Admin"),
  robots: { index: false },
};

export default function CommitteeEmailPage(
  props: PageProps<"/ops/committee-email">,
) {
  return (
    <OpsPage
      title="Monthly committee email"
      intro="The monthly email to each mandir's committee."
    >
      <Suspense fallback={<Loading />}>
        <Preview {...props} />
      </Suspense>
    </OpsPage>
  );
}

async function Preview({ searchParams }: PageProps<"/ops/committee-email">) {
  await requireToranAdmin("/ops/committee-email");
  const supabase = await createSessionClient();
  if (!supabase) {
    return <Notice tone="error">Couldn&apos;t load the mandirs.</Notice>;
  }
  const query = await searchParams;
  // Only mandirs with a committee on Toran get it.
  const { data: mandirs } = await supabase
    .from("mandirs")
    .select("id, slug, name, town, calendar, postcode, website, phone")
    .eq("status", "claimed")
    .order("name");
  const chosen = (mandirs ?? []).find((m) => m.slug === query.mandir);

  let email: { subject: string; text: string } | null = null;
  let problem = false;
  if (chosen) {
    const since = periodDays(londonDate(), MONTHLY_DAYS)[0];
    const [facts, counts] = await Promise.all([
      loadCommitteeFacts(supabase, chosen),
      supabase.rpc("mandir_count_summary", { target: chosen.id, since }),
    ]);
    problem = !!counts.error;
    email = committeeMonthly({
      mandir: chosen,
      numbers: mandirNumbers(readSummary(counts.data), chosen.slug),
      events: facts.events.filter((e) => e.status === "published"),
      tasks: committeeTasks(facts),
      siteUrl: siteUrl(),
    });
  }

  return (
    <>
      <Notice>
        <strong>Not sent.</strong> Emails to committees are off until the ICO
        registration and DPIA are done (decision 0006), and nothing on Toran
        sends this one yet. This page shows what it would say, to check the
        wording.
      </Notice>

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-[1_1_18rem] flex-col gap-2">
            <span className="font-semibold">Mandir with a committee</span>
            <select
              name="mandir"
              defaultValue={chosen?.slug ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Choose a mandir
              </option>
              {(mandirs ?? []).map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.name}, {m.town}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={quietButtonClass}>
            Show
          </button>
        </form>
        {(mandirs ?? []).length === 0 && (
          <p className="text-muted">No mandir has a committee on Toran yet.</p>
        )}
      </Card>

      {email && (
        <section
          aria-labelledby="preview"
          className="flex max-w-3xl flex-col gap-3"
        >
          <h2 id="preview" className="text-2xl font-bold">
            {email.subject}
          </h2>
          {problem && (
            <Notice tone="error">
              The page numbers couldn&apos;t be loaded, so they show as 0.
            </Notice>
          )}
          <pre className="border-line bg-surface rounded-2xl border p-5 font-sans text-lg whitespace-pre-wrap">
            {email.text}
          </pre>
          <CopyText text={email.text} label="Copy the text" />
        </section>
      )}
    </>
  );
}
