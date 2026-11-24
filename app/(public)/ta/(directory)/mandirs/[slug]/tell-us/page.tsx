import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/tell-us/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The mandirs/[slug]/tell-us page in Tamil.
export default function TamilTellUs(
  props: PageProps<"/ta/mandirs/[slug]/tell-us">,
) {
  setPageLocale("ta");
  return (
    <English {...(props as unknown as PageProps<"/mandirs/[slug]/tell-us">)} />
  );
}
