import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { RAM_NAVAMI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/ram-navami/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(RAM_NAVAMI, town);
}

export default async function Page(props: PageProps<"/ram-navami/[town]">) {
  const { town } = await props.params;
  return <SeasonTownPage season={RAM_NAVAMI} slug={town} />;
}
