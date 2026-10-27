import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { JANMASHTAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(JANMASHTAMI);
}

// The janmashtami page in Hindi.
export default function HindiJanmashtami(props: PageProps<"/hi/janmashtami">) {
  setPageLocale("hi");
  return <SeasonPage season={JANMASHTAMI} searchParams={props.searchParams} />;
}
