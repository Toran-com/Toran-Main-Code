import type { Metadata } from "next";
import { Hub } from "@/components/hub";
import { PageHeading } from "@/components/public-shell";
import { localePath, pageT } from "@/lib/i18n/page";
import { pageMetadata } from "@/lib/site";

// My Toran: the mandirs this phone follows, its plan, seva and past
// events, in one place. All of it is kept on the phone (components/hub.tsx);
// the page itself is the same for everyone.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return {
    ...pageMetadata(t("my.title"), t("my.description"), localePath("/my")),
    // It's different on every phone, so not for search engines.
    robots: { index: false, follow: true },
  };
}

export default function MyToranPage() {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-8 sm:gap-10">
      <PageHeading title={t("my.title")} intro={t("my.intro")} />
      <Hub />
    </div>
  );
}
