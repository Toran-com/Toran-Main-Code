import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { DIWALI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(DIWALI);

export default function DiwaliPage(props: PageProps<"/diwali">) {
  return <SeasonPage season={DIWALI} searchParams={props.searchParams} />;
}
