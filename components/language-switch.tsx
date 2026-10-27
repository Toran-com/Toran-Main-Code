"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { languagePath, localeOfPath } from "@/lib/i18n/paths";

export type Language = { locale: Locale; name: string; lang: string };

// A link to the same page in each of the other languages ("ગુજરાતી",
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
        className="text-ink hover:bg-sunk shrink-0 rounded-full px-3 py-2 text-base font-medium no-underline"
      >
        {l.name}
      </Link>
    ));
}
