import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/request/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The mandirs/[slug]/request page in Tamil.
export default function TamilRequest(
  props: PageProps<"/ta/mandirs/[slug]/request">,
) {
  setPageLocale("ta");
  return (
    <English {...(props as unknown as PageProps<"/mandirs/[slug]/request">)} />
  );
}
