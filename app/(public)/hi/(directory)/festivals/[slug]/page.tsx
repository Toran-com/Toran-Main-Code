import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/festivals/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/hi/festivals/[slug]">,
): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata(props as unknown as PageProps<"/festivals/[slug]">);
}

// The festivals/[slug] page in Hindi.
export default function HindiFestival(
  props: PageProps<"/hi/festivals/[slug]">,
) {
  setPageLocale("hi");
  return <English {...(props as unknown as PageProps<"/festivals/[slug]">)} />;
}
