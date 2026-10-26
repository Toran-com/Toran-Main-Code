import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/maha-shivaratri/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(MAHA_SHIVARATRI, town);
}

export default async function Page(
  props: PageProps<"/maha-shivaratri/[town]">,
) {
  const { town } = await props.params;
  return <SeasonTownPage season={MAHA_SHIVARATRI} slug={town} />;
}
