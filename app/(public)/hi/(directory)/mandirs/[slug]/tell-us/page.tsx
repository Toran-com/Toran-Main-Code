import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/tell-us/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The mandirs/[slug]/tell-us page in Hindi.
export default function HindiTellUs(
  props: PageProps<"/hi/mandirs/[slug]/tell-us">,
) {
  setPageLocale("hi");
  return (
    <English {...(props as unknown as PageProps<"/mandirs/[slug]/tell-us">)} />
  );
}
