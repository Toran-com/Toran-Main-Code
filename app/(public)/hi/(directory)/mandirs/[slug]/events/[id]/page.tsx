import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/events/[id]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/hi/mandirs/[slug]/events/[id]">,
): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata(
    props as unknown as PageProps<"/mandirs/[slug]/events/[id]">,
  );
}

// The mandirs/[slug]/events/[id] page in Hindi.
export default function HindiEvent(
  props: PageProps<"/hi/mandirs/[slug]/events/[id]">,
) {
  setPageLocale("hi");
  return (
    <English
      {...(props as unknown as PageProps<"/mandirs/[slug]/events/[id]">)}
    />
  );
}
