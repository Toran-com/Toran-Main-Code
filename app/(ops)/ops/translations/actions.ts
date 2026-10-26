"use server";

import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { MESSAGES } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { createSessionClient } from "@/lib/supabase/session";
import { lineStamp, parseStamps } from "@/lib/translation-review";

// "Mark these as checked": records the lines a reviewer has been through,
// as they read now, so the next pack leaves them out. A line that has
// changed since the page was opened is left for the next pack.
export async function markChecked(formData: FormData) {
  await requireToranAdmin("/ops/translations");
  const stamps = parseStamps(String(formData.get("lines") ?? ""));
  const english: Record<string, string> = en;
  const gujarati: Partial<Record<string, string>> = MESSAGES.gu;
  const rows = [...stamps]
    .filter(([key]) => Object.hasOwn(english, key) && gujarati[key])
    .map(([key, stamp]) => ({
      key,
      english: english[key],
      gujarati: gujarati[key]!,
      stamp,
    }))
    .filter((r) => lineStamp(r.english, r.gujarati) === r.stamp)
    .map(({ key, english, gujarati }) => ({
      key,
      english,
      gujarati,
      checked_at: new Date().toISOString(),
    }));
  if (!rows.length) redirect("/ops/translations?error=nothing");

  const supabase = await createSessionClient();
  const { error } = supabase
    ? await supabase.from("translation_checks").upsert(rows)
    : { error: true };
  if (error) redirect("/ops/translations?error=failed");
  redirect(`/ops/translations?checked=${rows.length}`);
}
