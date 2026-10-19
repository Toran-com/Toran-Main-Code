import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { RAM_NAVAMI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(RAM_NAVAMI);

export default function RamNavamiPage(props: PageProps<"/ram-navami">) {
  return <SeasonPage season={RAM_NAVAMI} searchParams={props.searchParams} />;
}
