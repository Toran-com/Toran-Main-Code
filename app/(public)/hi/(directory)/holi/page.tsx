import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { HOLI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(HOLI);
}

// The holi page in Hindi.
export default function HindiHoli(props: PageProps<"/hi/holi">) {
  setPageLocale("hi");
  return <SeasonPage season={HOLI} searchParams={props.searchParams} />;
}
