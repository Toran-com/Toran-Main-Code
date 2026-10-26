import { MESSAGES } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import { createSessionClient } from "@/lib/supabase/session";
import { reviewLines, type Checked } from "@/lib/translation-review";

// Every line of the site's wording with whether a reviewer has checked
// it. "saved" is false when the checks couldn't be read (no database
// yet): then every line counts as new and none can be marked checked.
export async function loadReviewLines() {
  const supabase = await createSessionClient();
  const { data, error } = supabase
    ? await supabase.from("translation_checks").select("key, english, gujarati")
    : { data: null, error: true };
  const checked = new Map<string, Checked>(
    (data ?? []).map((c) => [
      c.key,
      { english: c.english, gujarati: c.gujarati },
    ]),
  );
  return {
    lines: reviewLines(en, MESSAGES.gu, checked),
    saved: !error,
  };
}
