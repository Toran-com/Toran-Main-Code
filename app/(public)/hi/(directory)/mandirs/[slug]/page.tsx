import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/hi/mandirs/[slug]">,
): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata(props as unknown as PageProps<"/mandirs/[slug]">);
}

// The mandirs/[slug] page in Hindi.
export default function HindiMandir(props: PageProps<"/hi/mandirs/[slug]">) {
  setPageLocale("hi");
  return <English {...(props as unknown as PageProps<"/mandirs/[slug]">)} />;
}
