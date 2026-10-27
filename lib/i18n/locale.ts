import { cache } from "react";
import {
  enShared,
  guShared,
  hiShared,
  type SharedKey,
} from "@/lib/i18n/shared-messages";
import { fill, type Values } from "@/lib/i18n/core";

export type Locale = "en" | "gu" | "hi";

// The language of the page being rendered. Gujarati and Hindi pages
// (/gu/…, /hi/…) set it
// before rendering, in their layout and in each page (they can render in
// either order); everything else is English. React's cache keeps it for
// one request only, and in the browser it's always English (browser
// components use components/use-t.ts instead).
const store = cache((): { locale: Locale } => ({ locale: "en" }));

export function setPageLocale(locale: Locale): void {
  store().locale = locale;
}

export function pageLocale(): Locale {
  return store().locale;
}

// The shared lines (dates, kinds of event, distances…) in the page's
// language, for helpers that the browser loads too: only the few lines in
// lib/i18n/shared-messages.ts, not every translation.
export function sharedT() {
  const locale = pageLocale();
  const messages =
    locale === "gu" ? guShared : locale === "hi" ? hiShared : enShared;
  return (key: SharedKey, values?: Values) =>
    fill(messages, enShared, key, values);
}
