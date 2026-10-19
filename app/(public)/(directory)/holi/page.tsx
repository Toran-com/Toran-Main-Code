import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { HOLI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(HOLI);

export default function HoliPage(props: PageProps<"/holi">) {
  return <SeasonPage season={HOLI} searchParams={props.searchParams} />;
}
