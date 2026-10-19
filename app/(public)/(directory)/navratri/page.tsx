import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { NAVRATRI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(NAVRATRI);

export default function NavratriPage(props: PageProps<"/navratri">) {
  return <SeasonPage season={NAVRATRI} searchParams={props.searchParams} />;
}
