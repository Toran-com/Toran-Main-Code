import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/festivals/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/gu/festivals/[slug]">,
): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata(props as unknown as PageProps<"/festivals/[slug]">);
}

// The festivals/[slug] page in Gujarati.
export default function GujaratiFestival(
  props: PageProps<"/gu/festivals/[slug]">,
) {
  setPageLocale("gu");
  return <English {...(props as unknown as PageProps<"/festivals/[slug]">)} />;
}
