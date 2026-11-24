import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { RAM_NAVAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(RAM_NAVAMI);
}

// The ram-navami page in Tamil.
export default function TamilRamNavami(props: PageProps<"/ta/ram-navami">) {
  setPageLocale("ta");
  return <SeasonPage season={RAM_NAVAMI} searchParams={props.searchParams} />;
}
