import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/tell-us/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The mandirs/[slug]/tell-us page in Gujarati.
export default function GujaratiTellUs(
  props: PageProps<"/gu/mandirs/[slug]/tell-us">,
) {
  setPageLocale("gu");
  return (
    <English {...(props as unknown as PageProps<"/mandirs/[slug]/tell-us">)} />
  );
}
