import type { Metadata } from "next";
import { MessagesProvider } from "@/components/messages-provider";
import { LOCALES } from "@/lib/i18n";
import { taClient } from "@/lib/i18n/client-messages-ta";
import { setPageLocale } from "@/lib/i18n/page";

// The Tamil pages (/ta/…): the same pages as English, in Tamil. Until
// a native speaker has checked the Tamil (LOCALES.ta.ready), they say
// they're a draft, aren't linked from the English pages, and search
// engines are asked to leave them out.
export const metadata: Metadata = LOCALES.ta.ready
  ? {}
  : { robots: { index: false, follow: false } };

export default function TamilLayout({ children }: LayoutProps<"/ta">) {
  setPageLocale("ta");
  return (
    <div lang="ta" className="contents">
      {!LOCALES.ta.ready && (
        <p className="bg-marigold/15 text-marigold-ink px-4 py-2 text-center text-base font-semibold">
          தமிழ் மொழிபெயர்ப்பு இன்னும் சரிபார்க்கப்படுகிறது. This Tamil version
          is a draft being checked.
        </p>
      )}
      <MessagesProvider messages={taClient}>{children}</MessagesProvider>
    </div>
  );
}
