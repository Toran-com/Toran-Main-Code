import type { Metadata } from "next";
import Home from "@/app/(public)/page";
import { pageMetadata, site } from "@/lib/site";
import { pageT, setPageLocale } from "@/lib/i18n/page";

// The browser tab and link preview in Tamil too.
export function generateMetadata(): Metadata {
  setPageLocale("ta");
  const t = pageT();
  const title = `${site.name} · ${t("home.tagline")}`;
  const english = pageMetadata(undefined, t("home.intro"), "/ta");
  return {
    ...english,
    title,
    openGraph: { ...english.openGraph, title, locale: "hi_IN" },
  };
}

// The home page in Tamil.
export default function TamilHome(props: PageProps<"/ta">) {
  setPageLocale("ta");
  return <Home {...props} />;
}
