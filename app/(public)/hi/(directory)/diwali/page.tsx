import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { DIWALI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(DIWALI);
}

// The diwali page in Hindi.
export default function HindiDiwali(props: PageProps<"/hi/diwali">) {
  setPageLocale("hi");
  return <SeasonPage season={DIWALI} searchParams={props.searchParams} />;
}
