import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export const metadata: Metadata = seasonMetadata(GANESH_CHATURTHI);

export default function GaneshChaturthiPage(
  props: PageProps<"/ganesh-chaturthi">,
) {
  return (
    <SeasonPage season={GANESH_CHATURTHI} searchParams={props.searchParams} />
  );
}
