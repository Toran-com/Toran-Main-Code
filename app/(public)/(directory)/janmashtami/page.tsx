import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { JANMASHTAMI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(JANMASHTAMI);

export default function JanmashtamiPage(props: PageProps<"/janmashtami">) {
  return <SeasonPage season={JANMASHTAMI} searchParams={props.searchParams} />;
}
