import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(MAHA_SHIVARATRI);
}

// The maha-shivaratri page in Gujarati.
export default function GujaratiMahaShivaratri(
  props: PageProps<"/gu/maha-shivaratri">,
) {
  setPageLocale("gu");
  return (
    <SeasonPage season={MAHA_SHIVARATRI} searchParams={props.searchParams} />
  );
}
