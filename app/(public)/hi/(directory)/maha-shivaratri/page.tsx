import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(MAHA_SHIVARATRI);
}

// The maha-shivaratri page in Hindi.
export default function HindiMahaShivaratri(
  props: PageProps<"/hi/maha-shivaratri">,
) {
  setPageLocale("hi");
  return (
    <SeasonPage season={MAHA_SHIVARATRI} searchParams={props.searchParams} />
  );
}
