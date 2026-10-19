import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/gu/mandirs/[slug]">,
): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata(props as unknown as PageProps<"/mandirs/[slug]">);
}

// The mandirs/[slug] page in Gujarati.
export default function GujaratiMandir(props: PageProps<"/gu/mandirs/[slug]">) {
  setPageLocale("gu");
  return <English {...(props as unknown as PageProps<"/mandirs/[slug]">)} />;
}
