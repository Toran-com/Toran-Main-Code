import type { SupabaseClient } from "@supabase/supabase-js";
import { committeeDigest, lastWeekStart } from "@/lib/committee-digest";
import { digestContent } from "@/lib/committee-digest-send";
import type { Database } from "@/lib/database.types";
import { londonDate } from "@/lib/london";
import { siteUrl } from "@/lib/site";

export type PreviewMandir = {
  id: string;
  slug: string;
  name: string;
  town: string;
  calendar: string | null;
  postcode: string | null;
  website: string | null;
  phone: string | null;
};

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Last week's email for one mandir, as a Toran admin sees it (the preview,
// and "Send this to me"): the same as committees get on Monday, without a
// member's own stop link. Read with the admin's own login, so it uses the
// same checked functions as the Numbers page.
export async function previewEmail(
  db: SupabaseClient<Database>,
  mandir: PreviewMandir,
) {
  const weekStart = lastWeekStart(londonDate());
  const [counts, weekCounts, supporters, supportersBoth, members] =
    await Promise.all([
      db.rpc("mandir_count_summary", {
        target: mandir.id,
        since: addDays(weekStart, -7),
      }),
      db.rpc("mandir_count_summary", { target: mandir.id, since: weekStart }),
      db.rpc("mandir_supporters", { target: mandir.id, since: weekStart }),
      db.rpc("mandir_supporters", {
        target: mandir.id,
        since: addDays(weekStart, -7),
      }),
      db
        .from("mandir_admins")
        .select("user_id", { count: "exact", head: true })
        .eq("mandir_id", mandir.id),
    ]);
  const content = await digestContent(
    db,
    {
      mandir,
      members: Math.max(1, members.count ?? 1),
      counts: counts.data,
      weekPaths: (weekCounts.data as { paths?: unknown } | null)?.paths,
      supporters: supporters.data,
      supportersBoth: supportersBoth.data,
    },
    weekStart,
    siteUrl(),
  );
  return {
    problem:
      !!counts.error ||
      !!weekCounts.error ||
      !!supporters.error ||
      !!supportersBoth.error,
    email: committeeDigest(content),
  };
}
