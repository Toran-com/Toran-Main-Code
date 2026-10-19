import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("gu");
  return seasonMetadata(GANESH_CHATURTHI);
}

// The ganesh-chaturthi page in Gujarati.
export default function GujaratiGaneshChaturthi(
  props: PageProps<"/gu/ganesh-chaturthi">,
) {
  setPageLocale("gu");
  return (
    <SeasonPage season={GANESH_CHATURTHI} searchParams={props.searchParams} />
  );
}
