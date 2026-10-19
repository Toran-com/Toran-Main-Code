import type { Metadata } from "next";
import { LOCALES } from "@/lib/i18n";
import { setPageLocale } from "@/lib/i18n/page";

// The Gujarati pages (/gu/…): the same pages as English, in Gujarati. Until
// a native speaker has checked the Gujarati (LOCALES.gu.ready), they say
// they're a draft, aren't linked from the English pages, and search
// engines are asked to leave them out.
export const metadata: Metadata = LOCALES.gu.ready
  ? {}
  : { robots: { index: false, follow: false } };

export default function GujaratiLayout({ children }: LayoutProps<"/gu">) {
  setPageLocale("gu");
  return (
    <div lang="gu" className="contents">
      {!LOCALES.gu.ready && (
        <p className="bg-marigold/15 text-marigold-ink px-4 py-2 text-center text-base font-semibold">
          ગુજરાતી અનુવાદ હજી તપાસાઈ રહ્યો છે. This Gujarati version is a draft
          being checked.
        </p>
      )}
      {children}
    </div>
  );
}
