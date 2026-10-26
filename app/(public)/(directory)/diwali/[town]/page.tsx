import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { DIWALI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/diwali/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(DIWALI, town);
}

export default async function Page(props: PageProps<"/diwali/[town]">) {
  const { town } = await props.params;
  return <SeasonTownPage season={DIWALI} slug={town} />;
}
