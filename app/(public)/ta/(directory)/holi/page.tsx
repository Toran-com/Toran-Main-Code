import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { HOLI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(HOLI);
}

// The holi page in Tamil.
export default function TamilHoli(props: PageProps<"/ta/holi">) {
  setPageLocale("ta");
  return <SeasonPage season={HOLI} searchParams={props.searchParams} />;
}
