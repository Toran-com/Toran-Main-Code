import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(MAHA_SHIVARATRI);

export default function MahaShivaratriPage(
  props: PageProps<"/maha-shivaratri">,
) {
  return (
    <SeasonPage season={MAHA_SHIVARATRI} searchParams={props.searchParams} />
  );
}
