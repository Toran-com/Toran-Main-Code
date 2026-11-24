import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { DIWALI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(DIWALI);
}

// The diwali page in Tamil.
export default function TamilDiwali(props: PageProps<"/ta/diwali">) {
  setPageLocale("ta");
  return <SeasonPage season={DIWALI} searchParams={props.searchParams} />;
}
