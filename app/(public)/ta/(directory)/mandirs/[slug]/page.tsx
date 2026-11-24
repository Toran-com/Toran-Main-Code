import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/ta/mandirs/[slug]">,
): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata(props as unknown as PageProps<"/mandirs/[slug]">);
}

// The mandirs/[slug] page in Tamil.
export default function TamilMandir(props: PageProps<"/ta/mandirs/[slug]">) {
  setPageLocale("ta");
  return <English {...(props as unknown as PageProps<"/mandirs/[slug]">)} />;
}
