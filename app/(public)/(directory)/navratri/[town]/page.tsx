import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { NAVRATRI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/navratri/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(NAVRATRI, town);
}

export default async function Page(props: PageProps<"/navratri/[town]">) {
  const { town } = await props.params;
  return <SeasonTownPage season={NAVRATRI} slug={town} />;
}
