import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(MAHA_SHIVARATRI);
}

// The maha-shivaratri page in Tamil.
export default function TamilMahaShivaratri(
  props: PageProps<"/ta/maha-shivaratri">,
) {
  setPageLocale("ta");
  return (
    <SeasonPage season={MAHA_SHIVARATRI} searchParams={props.searchParams} />
  );
}
