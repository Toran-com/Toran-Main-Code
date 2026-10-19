"use server";

import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { createSessionClient } from "@/lib/supabase/session";
import { checkWebsite } from "@/lib/website-check";
import { recordWebsiteCheck, websiteQueue } from "@/lib/website-claims";

// Toran admins read mandirs' websites for events (lib/website-check.ts).
// Checked as an admin first, so nobody else can make Toran fetch sites.

const BATCH = 5;
// Stop starting new checks after this long, to finish inside the page's
// time limit (maxDuration in page.tsx): one check can take about 33
// seconds (lib/website-check.ts).
const BUDGET_MS = 20_000;

export async function checkOne(formData: FormData) {
  await requireToranAdmin("/ops/websites");
  const slug = String(formData.get("mandir") ?? "");
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops/websites?error=failed");
  const { data: mandir } = await supabase
    .from("mandirs")
    .select("id, slug, website")
    .eq("slug", slug)
    .maybeSingle();
  if (!mandir?.website) redirect("/ops/websites?error=failed");

  const result = await checkWebsite(mandir.website);
  const saved = await recordWebsiteCheck(
    supabase,
    { id: mandir.id, website: mandir.website },
    result,
  );
  if (!saved) redirect("/ops/websites?error=failed");
  redirect(
    `/ops/websites?checked=${encodeURIComponent(slug)}&outcome=${result.outcome}&added=${saved.added}`,
  );
}

// The websites checked longest ago (never-checked first).
export async function checkNext() {
  await requireToranAdmin("/ops/websites");
  const started = Date.now();
  const supabase = await createSessionClient();
  if (!supabase) redirect("/ops/websites?error=failed");
  const queue = await websiteQueue(supabase, BATCH);

  let checked = 0;
  let added = 0;
  for (const mandir of queue) {
    if (Date.now() - started > BUDGET_MS) break;
    const saved = await recordWebsiteCheck(
      supabase,
      mandir,
      await checkWebsite(mandir.website),
    );
    if (!saved) continue;
    checked++;
    added += saved.added;
  }
  redirect(`/ops/websites?batch=${checked}&added=${added}`);
}
