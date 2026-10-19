import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { NAVRATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(NAVRATRI);
}

// The navratri page in Gujarati.
export default function GujaratiNavratri(props: PageProps<"/gu/navratri">) {
  setPageLocale("gu");
  return <SeasonPage season={NAVRATRI} searchParams={props.searchParams} />;
}
