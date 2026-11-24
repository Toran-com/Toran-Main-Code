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
  props: PageProps<"/ta/ganesh-chaturthi/[town]">,
): Promise<Metadata> {
  setPageLocale("ta");
  const { town } = await props.params;
  return seasonTownMetadata(GANESH_CHATURTHI, town);
}

// The page in Tamil.
export default async function Page(
  props: PageProps<"/ta/ganesh-chaturthi/[town]">,
) {
  setPageLocale("ta");
  const { town } = await props.params;
  return <SeasonTownPage season={GANESH_CHATURTHI} slug={town} />;
}
