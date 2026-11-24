import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { JANMASHTAMI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(JANMASHTAMI);
}

// The janmashtami page in Tamil.
export default function TamilJanmashtami(props: PageProps<"/ta/janmashtami">) {
  setPageLocale("ta");
  return <SeasonPage season={JANMASHTAMI} searchParams={props.searchParams} />;
}
