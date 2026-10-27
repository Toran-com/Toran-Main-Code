import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { setPageLocale } from "@/lib/i18n/page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/hi/maha-shivaratri/[town]">,
): Promise<Metadata> {
  setPageLocale("hi");
  const { town } = await props.params;
  return seasonTownMetadata(MAHA_SHIVARATRI, town);
}

// The page in Hindi.
export default async function Page(
  props: PageProps<"/hi/maha-shivaratri/[town]">,
) {
  setPageLocale("hi");
  const { town } = await props.params;
  return <SeasonTownPage season={MAHA_SHIVARATRI} slug={town} />;
}
