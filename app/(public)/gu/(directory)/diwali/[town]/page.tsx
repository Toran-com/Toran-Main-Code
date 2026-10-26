import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { setPageLocale } from "@/lib/i18n/page";
import { DIWALI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/gu/diwali/[town]">,
): Promise<Metadata> {
  setPageLocale("gu");
  const { town } = await props.params;
  return seasonTownMetadata(DIWALI, town);
}

// The page in Gujarati.
export default async function Page(props: PageProps<"/gu/diwali/[town]">) {
  setPageLocale("gu");
  const { town } = await props.params;
  return <SeasonTownPage season={DIWALI} slug={town} />;
}
