import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { NAVRATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(NAVRATRI);
}

// The navratri page in Hindi.
export default function HindiNavratri(props: PageProps<"/hi/navratri">) {
  setPageLocale("hi");
  return <SeasonPage season={NAVRATRI} searchParams={props.searchParams} />;
}
