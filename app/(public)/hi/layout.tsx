import type { Metadata } from "next";
import { MessagesProvider } from "@/components/messages-provider";
import { LOCALES } from "@/lib/i18n";
import { hiClient } from "@/lib/i18n/client-messages-hi";
import { setPageLocale } from "@/lib/i18n/page";

// The Hindi pages (/hi/…): the same pages as English, in Hindi. Until
// a native speaker has checked the Hindi (LOCALES.hi.ready), they say
// they're a draft, aren't linked from the English pages, and search
// engines are asked to leave them out.
export const metadata: Metadata = LOCALES.hi.ready
  ? {}
  : { robots: { index: false, follow: false } };

export default function HindiLayout({ children }: LayoutProps<"/hi">) {
  setPageLocale("hi");
  return (
    <div lang="hi" className="contents">
      {!LOCALES.hi.ready && (
        <p className="bg-marigold/15 text-marigold-ink px-4 py-2 text-center text-base font-semibold">
          हिन्दी अनुवाद अभी जाँचा जा रहा है। This Hindi version is a draft being
          checked.
        </p>
      )}
      <MessagesProvider messages={hiClient}>{children}</MessagesProvider>
    </div>
  );
}
