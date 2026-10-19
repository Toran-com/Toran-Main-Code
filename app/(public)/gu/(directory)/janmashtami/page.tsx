import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { JANMASHTAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(JANMASHTAMI);
}

// The janmashtami page in Gujarati.
export default function GujaratiJanmashtami(
  props: PageProps<"/gu/janmashtami">,
) {
  setPageLocale("gu");
  return <SeasonPage season={JANMASHTAMI} searchParams={props.searchParams} />;
}
