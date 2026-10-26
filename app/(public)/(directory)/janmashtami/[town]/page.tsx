import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { JANMASHTAMI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/janmashtami/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(JANMASHTAMI, town);
}

export default async function Page(props: PageProps<"/janmashtami/[town]">) {
  const { town } = await props.params;
  return <SeasonTownPage season={JANMASHTAMI} slug={town} />;
}
