import { MESSAGES } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { createSessionClient } from "@/lib/supabase/session";
import {
  reviewLines,
  type Checked,
  type ReviewLocale,
} from "@/lib/translation-review";

// Every line of the site's wording with whether a reviewer of that
// language has checked it. "saved" is false when the checks couldn't be
// read (no database yet): then every line counts as new and none can be
// marked checked.
export async function loadReviewLines(locale: ReviewLocale) {
  const supabase = await createSessionClient();
  const { data, error } = supabase
    ? await supabase
        .from("translation_checks")
        .select("key, english, translation")
        .eq("locale", locale)
    : { data: null, error: true };
  const checked = new Map<string, Checked>(
    (data ?? []).map((c) => [
      c.key,
      { english: c.english, translation: c.translation },
    ]),
  );
  return {
    lines: reviewLines(en, MESSAGES[locale], checked),
    saved: !error,
  };
}
