"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { otherLanguagePath } from "@/lib/i18n/paths";

// "ગુજરાતી" on English pages and "English" on Gujarati ones, to the same
// page in the other language (or the Gujarati home page, for pages that
// are only in English).
export function LanguageSwitch() {
  const path = usePathname();
  const gujarati = path === "/gu" || path.startsWith("/gu/");
  const target = otherLanguagePath(path);
  return (
    <Link
      href={target === path ? "/gu" : target}
      lang={gujarati ? "en-GB" : "gu"}
      hrefLang={gujarati ? "en-GB" : "gu"}
      className="text-ink hover:bg-sunk shrink-0 rounded-full px-3 py-2 text-base font-medium no-underline"
    >
      {gujarati ? "English" : "ગુજરાતી"}
    </Link>
  );
}
