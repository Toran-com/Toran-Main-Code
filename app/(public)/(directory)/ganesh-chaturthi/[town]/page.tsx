import type { Metadata } from "next";
import {
  SeasonTownPage,
  seasonTownMetadata,
  seasonTownParams,
} from "@/components/season-town-page";
import { GANESH_CHATURTHI } from "@/lib/seasons";

export const ensureStatic = "navigation";

export const generateStaticParams = seasonTownParams;

export async function generateMetadata(
  props: PageProps<"/ganesh-chaturthi/[town]">,
): Promise<Metadata> {
  const { town } = await props.params;
  return seasonTownMetadata(GANESH_CHATURTHI, town);
}

export default async function Page(
  props: PageProps<"/ganesh-chaturthi/[town]">,
) {
  const { town } = await props.params;
  return <SeasonTownPage season={GANESH_CHATURTHI} slug={town} />;
}
