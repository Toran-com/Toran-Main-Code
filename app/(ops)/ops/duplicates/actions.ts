"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { keepApart, mergeEvents } from "@/lib/duplicate-check";
import { createSessionClient } from "@/lib/supabase/session";

// Two copies of an event on Toran: keep one (it gains anything only the
// other said, and the other is removed), or say they're different events
// so they're never paired again.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function decidePair(formData: FormData) {
  await requireToranAdmin("/ops/duplicates");
  const keep = String(formData.get("keep") ?? "");
  const other = String(formData.get("other") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const back: (query: string) => never = (query) =>
    redirect(`/ops/duplicates?${query}`);
  if (!UUID.test(keep) || !UUID.test(other) || keep === other) {
    back("error=failed");
  }
  const supabase = await createSessionClient();
  if (!supabase) back("error=failed");

  if (decision === "different") {
    if (!(await keepApart(supabase, keep, [other]))) back("error=failed");
    back("done=different");
  }

  const { data: mandir } = await supabase
    .from("events")
    .select("mandir:mandirs (slug)")
    .eq("id", keep)
    .maybeSingle();
  const result = await mergeEvents(supabase, keep, other);
  if (result !== "ok") back(`error=${result}`);
  if (mandir?.mandir) updateTag(`mandir:${mandir.mandir.slug}`);
  updateTag("events");
  back("done=merged");
}
