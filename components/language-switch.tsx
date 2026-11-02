"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { languagePath, localeOfPath } from "@/lib/i18n/paths";
import { menuRowClass } from "@/components/site-menu";

export type Language = { locale: Locale; name: string; lang: string };

// In the menu: a link to the same page in each of the other languages ("ગુજરાતી",
// "हिन्दी", "English"), or that language's home page for pages that are
// only in English.
export function LanguageSwitch({ languages }: { languages: Language[] }) {
  const path = usePathname();
  const current = localeOfPath(path);
  return languages
    .filter((l) => l.locale !== current)
    .map((l) => (
      <Link
        key={l.locale}
        href={languagePath(path, l.locale)}
        lang={l.lang}
        hrefLang={l.lang}
        className={menuRowClass}
      >
        {l.name}
      </Link>
    ));
}
