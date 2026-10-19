import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { RAM_NAVAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(RAM_NAVAMI);
}

// The ram-navami page in Gujarati.
export default function GujaratiRamNavami(props: PageProps<"/gu/ram-navami">) {
  setPageLocale("gu");
  return <SeasonPage season={RAM_NAVAMI} searchParams={props.searchParams} />;
}
