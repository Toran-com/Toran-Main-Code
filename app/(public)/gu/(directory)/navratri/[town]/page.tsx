import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { setPageLocale } from "@/lib/i18n/page";
import { NAVRATRI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/gu/navratri/[town]">,
): Promise<Metadata> {
  setPageLocale("gu");
  const { town } = await props.params;
  return seasonTownMetadata(NAVRATRI, town);
}

// The page in Gujarati.
export default async function Page(props: PageProps<"/gu/navratri/[town]">) {
  setPageLocale("gu");
  const { town } = await props.params;
  return <SeasonTownPage season={NAVRATRI} slug={town} />;
}
