import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { DIWALI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(DIWALI);
}

// The diwali page in Gujarati.
export default function GujaratiDiwali(props: PageProps<"/gu/diwali">) {
  setPageLocale("gu");
  return <SeasonPage season={DIWALI} searchParams={props.searchParams} />;
}
