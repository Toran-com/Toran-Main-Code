import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCommitteeFacts } from "@/lib/committee-facts";
import { committeeMonthly, MONTHLY_DAYS } from "@/lib/committee-monthly";
import { committeeTasks } from "@/lib/committee-tasks";
import type { Database } from "@/lib/database.types";
import { londonDate } from "@/lib/london";
import { siteUrl } from "@/lib/site";
import {
  mandirNumbers,
  periodDays,
  readSummary,
  readSupporters,
} from "@/lib/stats";

export type PreviewMandir = {
  id: string;
  slug: string;
  name: string;
  calendar: string | null;
  postcode: string | null;
  website: string | null;
  phone: string | null;
};

// This month's email for one mandir, as a Toran admin sees it (the
// preview, and "Send this to me"): the same as committees get, without a
// member's own stop link.
export async function previewEmail(
  db: SupabaseClient<Database>,
  mandir: PreviewMandir,
) {
  const since = periodDays(londonDate(), MONTHLY_DAYS)[0];
  const [facts, counts, supporters] = await Promise.all([
    loadCommitteeFacts(db, mandir),
    db.rpc("mandir_count_summary", { target: mandir.id, since }),
    db.rpc("mandir_supporters", { target: mandir.id, since }),
  ]);
  return {
    problem: !!counts.error || !!supporters.error,
    email: committeeMonthly({
      mandir,
      numbers: mandirNumbers(readSummary(counts.data), mandir.slug),
      supporters: readSupporters(supporters.data),
      events: facts.events.filter((e) => e.status === "published"),
      tasks: committeeTasks(facts),
      siteUrl: siteUrl(),
    }),
  };
}
