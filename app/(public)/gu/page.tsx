import type { Metadata } from "next";
import Home from "@/app/(public)/page";
import { pageMetadata, site } from "@/lib/site";
import { pageT, setPageLocale } from "@/lib/i18n/page";

// The browser tab and link preview in Gujarati too.
export function generateMetadata(): Metadata {
  setPageLocale("gu");
  const t = pageT();
  const title = `${site.name} · ${t("home.tagline")}`;
  const english = pageMetadata(undefined, t("home.intro"), "/gu");
  return {
    ...english,
    title,
    openGraph: { ...english.openGraph, title, locale: "gu_IN" },
  };
}

// The home page in Gujarati.
export default function GujaratiHome() {
  setPageLocale("gu");
  return <Home />;
}
