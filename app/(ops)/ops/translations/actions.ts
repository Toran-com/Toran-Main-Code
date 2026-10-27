"use server";

import { redirect } from "next/navigation";
import { requireToranAdmin } from "@/lib/auth";
import { MESSAGES } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { createSessionClient } from "@/lib/supabase/session";
import { lineStamp, parseStamps, reviewLocale } from "@/lib/translation-review";

// "Mark these as checked": records the lines a reviewer has been through,
// as they read now, so the next pack leaves them out. A line that has
// changed since the page was opened is left for the next pack.
export async function markChecked(formData: FormData) {
  await requireToranAdmin("/ops/translations");
  const locale = reviewLocale(formData.get("locale"));
  const page = `/ops/translations?lang=${locale}`;
  const stamps = parseStamps(String(formData.get("lines") ?? ""));
  const english: Record<string, string> = en;
  const translated: Partial<Record<string, string>> = MESSAGES[locale];
  const rows = [...stamps]
    .filter(([key]) => Object.hasOwn(english, key) && translated[key])
    .map(([key, stamp]) => ({
      key,
      english: english[key],
      translation: translated[key]!,
      stamp,
    }))
    .filter((r) => lineStamp(r.english, r.translation) === r.stamp)
    .map(({ key, english, translation }) => ({
      locale,
      key,
      english,
      translation,
      checked_at: new Date().toISOString(),
    }));
  if (!rows.length) redirect(`${page}&error=nothing`);

  const supabase = await createSessionClient();
  const { error } = supabase
    ? await supabase.from("translation_checks").upsert(rows)
    : { error: true };
  if (error) redirect(`${page}&error=failed`);
  redirect(`${page}&checked=${rows.length}`);
}
