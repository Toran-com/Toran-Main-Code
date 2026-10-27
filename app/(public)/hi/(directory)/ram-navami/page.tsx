import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { RAM_NAVAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(RAM_NAVAMI);
}

// The ram-navami page in Hindi.
export default function HindiRamNavami(props: PageProps<"/hi/ram-navami">) {
  setPageLocale("hi");
  return <SeasonPage season={RAM_NAVAMI} searchParams={props.searchParams} />;
}
