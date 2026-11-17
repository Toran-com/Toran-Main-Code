"use server";

import { requireToranAdmin } from "@/lib/auth";
import { londonDate } from "@/lib/london";
import { queueRead } from "@/lib/poster-queue";
import {
  isPosterType,
  MAX_POSTER_BYTES,
  posterReadingOn,
  readPoster,
} from "@/lib/poster-reader";
import { createSessionClient } from "@/lib/supabase/session";
import {
  checkWebsite,
  fetchDocument,
  type CheckResult,
} from "@/lib/website-check";
import { recordWebsiteCheck } from "@/lib/website-claims";

// Toran admins scan mandirs' websites for events (lib/website-check.ts),
// the ticked ones in turn: the page calls this once per mandir
// (components/website-scan.tsx), so each gets the page's whole time limit
// (maxDuration in page.tsx). Checked as an admin first, so nobody else
// can make Toran fetch sites.

// Patrikas and posters a site links to, read with Claude per scan when
// it's switched on: the first few not read before.
const READ_PER_SITE = 2;
// Stop starting new reads after this long, to finish in time.
const READ_BUDGET_MS = 60_000;

export type ScanResult = {
  slug: string;
  outcome: CheckResult["outcome"] | "failed";
  // Events found on the site, and how many were new.
  found: number;
  added: number;
  // Patrikas read with Claude, and the new events read off them.
  read: number;
  readAdded: number;
  // Whose page the new events wait on: the mandir's committee, or Toran's
  // review queue when it has none.
  waitsFor: "committee" | "toran";
};

export async function scanWebsite(
  slug: string,
  readPatrikas: boolean,
): Promise<ScanResult> {
  await requireToranAdmin("/ops/websites");
  const started = Date.now();
  const failed: ScanResult = {
    slug,
    outcome: "failed",
    found: 0,
    added: 0,
    read: 0,
    readAdded: 0,
    waitsFor: "toran",
  };
  const supabase = await createSessionClient();
  if (!supabase) return failed;
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, name, town, website, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir?.website) return failed;
  const waitsFor = mandir.status === "claimed" ? "committee" : "toran";

  const result = await checkWebsite(mandir.website);
  const saved = await recordWebsiteCheck(
    supabase,
    { id: mandir.id, website: mandir.website },
    result,
  );
  if (!saved) return { ...failed, waitsFor };

  let read = 0;
  let readAdded = 0;
  if (readPatrikas && posterReadingOn()) {
    for (const doc of result.documents) {
      if (read >= READ_PER_SITE) break;
      if (Date.now() - started > READ_BUDGET_MS) break;
      // Read before: something from it is in the queue already, waiting
      // or dealt with.
      const { count } = await supabase
        .from("event_claims")
        .select("id", { count: "exact", head: true })
        .eq("mandir_id", mandir.id)
        .filter("proposed->>link", "eq", doc.url);
      if (count) continue;
      const file = await fetchDocument(doc.url, MAX_POSTER_BYTES);
      if (!file.ok || !isPosterType(file.type)) continue;
      read++;
      const poster = await readPoster(
        { data: file.data, type: file.type },
        {
          mandir: `${mandir.name}, ${mandir.town}`,
          today: londonDate(new Date()),
        },
      );
      if (!poster.ok) continue;
      const queued = await queueRead(
        supabase,
        mandir.id,
        "website",
        poster.events,
        doc.url.length <= 300 ? doc.url : "",
      );
      readAdded += queued.added;
    }
  }

  return {
    slug,
    outcome: result.outcome,
    found: result.events.length,
    added: saved.added,
    read,
    readAdded,
    waitsFor,
  };
}
