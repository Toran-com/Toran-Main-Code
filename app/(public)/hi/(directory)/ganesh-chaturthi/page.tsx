import type { Metadata } from "next";
import { SeasonPage, seasonMetadata } from "@/components/season-page";
import { setPageLocale } from "@/lib/i18n/page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export function generateMetadata(): Metadata {
  setPageLocale("hi");
  return seasonMetadata(GANESH_CHATURTHI);
}

// The ganesh-chaturthi page in Hindi.
export default function HindiGaneshChaturthi(
  props: PageProps<"/hi/ganesh-chaturthi">,
) {
  setPageLocale("hi");
  return (
    <SeasonPage season={GANESH_CHATURTHI} searchParams={props.searchParams} />
  );
}
