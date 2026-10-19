import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { HOLI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(HOLI);
}

// The holi page in Gujarati.
export default function GujaratiHoli(props: PageProps<"/gu/holi">) {
  setPageLocale("gu");
  return <SeasonPage season={HOLI} searchParams={props.searchParams} />;
}
