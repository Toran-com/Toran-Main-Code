"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { enClient, guClient, type ClientKey } from "@/lib/i18n/client-messages";
import { fill, type Values } from "@/lib/i18n/core";

export type Locale = "en" | "gu";

// The language of the page a browser component is on: Gujarati on /gu/…
// pages, English everywhere else.
export function useLocale(): Locale {
  const path = usePathname() ?? "";
  return path === "/gu" || path.startsWith("/gu/") ? "gu" : "en";
}

// The browser's few lines of text (lib/i18n/client-messages.ts) in that
// language: the same function while the language stays the same, so
// effects can depend on it.
export function useT() {
  const locale = useLocale();
  return useMemo(() => {
    const messages = locale === "gu" ? guClient : enClient;
    return (key: ClientKey, values?: Values) =>
      fill(messages, enClient, key, values);
  }, [locale]);
}
