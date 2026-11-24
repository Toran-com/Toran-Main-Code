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
  props: PageProps<"/ta/diwali/[town]">,
): Promise<Metadata> {
  setPageLocale("ta");
  const { town } = await props.params;
  return seasonTownMetadata(DIWALI, town);
}

// The page in Tamil.
export default async function Page(props: PageProps<"/ta/diwali/[town]">) {
  setPageLocale("ta");
  const { town } = await props.params;
  return <SeasonTownPage season={DIWALI} slug={town} />;
}
