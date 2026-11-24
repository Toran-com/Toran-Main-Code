import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { NAVRATRI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(NAVRATRI);
}

// The navratri page in Tamil.
export default function TamilNavratri(props: PageProps<"/ta/navratri">) {
  setPageLocale("ta");
  return <SeasonPage season={NAVRATRI} searchParams={props.searchParams} />;
}
