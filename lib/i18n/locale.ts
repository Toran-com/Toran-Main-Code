import { cache } from "react";
import { enClient, guClient, type ClientKey } from "@/lib/i18n/client-messages";
import { fill, type Values } from "@/lib/i18n/core";

export type Locale = "en" | "gu";

// The language of the page being rendered. Gujarati pages (/gu/…) set it
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
// lib/i18n/client-messages.ts, not every translation.
export function sharedT() {
  const messages = pageLocale() === "gu" ? guClient : enClient;
  return (key: ClientKey, values?: Values) =>
    fill(messages, enClient, key, values);
}
