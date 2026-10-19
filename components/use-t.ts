"use client";

import { usePathname } from "next/navigation";
import { useContext, useMemo } from "react";
import { MessagesContext } from "@/components/messages-provider";
import { fill, type Values } from "@/lib/i18n/core";

export type Locale = "en" | "gu";

// The language of the page a browser component is on: Gujarati on /gu/…
// pages, English everywhere else.
export function useLocale(): Locale {
  const path = usePathname() ?? "";
  return path === "/gu" || path.startsWith("/gu/") ? "gu" : "en";
}

// A browser component's lines in the page's language: pass its English
// (from lib/i18n/client/); the Gujarati comes with Gujarati pages
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
