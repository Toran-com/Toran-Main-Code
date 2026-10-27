import type { Metadata } from "next";
import Home from "@/app/(public)/page";
import { pageMetadata, site } from "@/lib/site";
import { pageT, setPageLocale } from "@/lib/i18n/page";

// The browser tab and link preview in Hindi too.
export function generateMetadata(): Metadata {
  setPageLocale("hi");
  const t = pageT();
  const title = `${site.name} · ${t("home.tagline")}`;
  const english = pageMetadata(undefined, t("home.intro"), "/hi");
  return {
    ...english,
    title,
    openGraph: { ...english.openGraph, title, locale: "hi_IN" },
  };
}

// The home page in Hindi.
export default function HindiHome(props: PageProps<"/hi">) {
  setPageLocale("hi");
  return <Home {...props} />;
}
