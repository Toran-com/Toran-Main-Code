import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/request/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The mandirs/[slug]/request page in Hindi.
export default function HindiRequest(
  props: PageProps<"/hi/mandirs/[slug]/request">,
) {
  setPageLocale("hi");
  return (
    <English {...(props as unknown as PageProps<"/mandirs/[slug]/request">)} />
  );
}
