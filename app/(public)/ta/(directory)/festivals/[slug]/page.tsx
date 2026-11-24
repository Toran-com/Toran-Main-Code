import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/festivals/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/ta/festivals/[slug]">,
): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata(props as unknown as PageProps<"/festivals/[slug]">);
}

// The festivals/[slug] page in Tamil.
export default function TamilFestival(
  props: PageProps<"/ta/festivals/[slug]">,
) {
  setPageLocale("ta");
  return <English {...(props as unknown as PageProps<"/festivals/[slug]">)} />;
}
