import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { setPageLocale } from "@/lib/i18n/page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/gu/ganesh-chaturthi/[town]">,
): Promise<Metadata> {
  setPageLocale("gu");
  const { town } = await props.params;
  return seasonTownMetadata(GANESH_CHATURTHI, town);
}

// The page in Gujarati.
export default async function Page(
  props: PageProps<"/gu/ganesh-chaturthi/[town]">,
) {
  setPageLocale("gu");
  const { town } = await props.params;
  return <SeasonTownPage season={GANESH_CHATURTHI} slug={town} />;
}
