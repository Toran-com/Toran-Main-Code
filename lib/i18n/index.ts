import { en, type MessageKey } from "@/lib/i18n/en";
import { gu } from "@/lib/i18n/gu";
import { fill, type Values } from "@/lib/i18n/core";

// A small translation layer: typed keys, "{name}" values, and English
// whenever a translation is missing. The site uses English only until a
// translation has been checked by a native speaker ("ready").

export type Locale = "en" | "gu";
export type { MessageKey };

export const LOCALES: Record<
  Locale,
  { name: string; lang: string; ready: boolean }
> = {
  en: { name: "English", lang: "en-GB", ready: true },
  gu: { name: "ગુજરાતી", lang: "gu", ready: false },
};

export const MESSAGES: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en,
  gu,
};

export const DEFAULT_LOCALE: Locale = "en";

export function translator(locale: Locale = DEFAULT_LOCALE) {
  const messages = MESSAGES[locale];
  function t(key: MessageKey, values: Values = {}): string {
    return fill(messages, en, key, values);
  }
  // "1 event", "3 events": English and Gujarati only need one and other.
  t.count = (
    key:
      | "whatsOn.count"
      | "home.regionCount"
      | "sevaList.count"
      | "sevaList.free"
      | "sevaList.places"
      | "sevaList.atMandirs"
      | "sevaList.taken",
    count: number,
  ) => t(count === 1 ? `${key}.one` : `${key}.other`, { count });
  return t;
}

// The "{name}" values a piece of text expects, for checking translations.
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}
