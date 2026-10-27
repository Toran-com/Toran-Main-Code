"use client";

import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
import { MessagesContext } from "@/components/messages-provider";
import type { Locale } from "@/lib/i18n";
import { fill, type Values } from "@/lib/i18n/core";
import { localeOfPath } from "@/lib/i18n/paths";

export type { Locale };

// The language of the page a browser component is on: Gujarati on /gu/…
// pages, Hindi on /hi/… pages, English everywhere else.
export function useLocale(): Locale {
  return localeOfPath(usePathname() ?? "");
}

// A browser component's lines in the page's language: pass its English
// (from lib/i18n/client/); the Gujarati or Hindi comes with those pages
// (components/messages-provider.tsx). The same function while the
// language stays the same, so effects can depend on it.
export function useT<K extends string>(english: Record<K, string>) {
  const translated = useContext(MessagesContext) as Partial<
    Record<K, string>
  > | null;
  return useMemo(
    () => (key: K, values?: Values) =>
      fill(translated ?? english, english, key, values),
    [translated, english],
  );
}
