import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("ta");
  return seasonMetadata(GANESH_CHATURTHI);
}

// The ganesh-chaturthi page in Tamil.
export default function TamilGaneshChaturthi(
  props: PageProps<"/ta/ganesh-chaturthi">,
) {
  setPageLocale("ta");
  return (
    <SeasonPage season={GANESH_CHATURTHI} searchParams={props.searchParams} />
  );
}
