import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { HOLI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/holi/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(HOLI, town);
}

export default async function Page(props: PageProps<"/holi/[town]">) {
  const { town } = await props.params;
  return <SeasonTownPage season={HOLI} slug={town} />;
}
