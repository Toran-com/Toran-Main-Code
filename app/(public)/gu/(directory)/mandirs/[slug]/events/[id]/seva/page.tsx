import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/events/[id]/seva/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/gu/mandirs/[slug]/events/[id]/seva">,
): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata(
    props as unknown as PageProps<"/mandirs/[slug]/events/[id]/seva">,
  );
}

// The mandirs/[slug]/events/[id]/seva page in Gujarati.
export default function GujaratiSeva(
  props: PageProps<"/gu/mandirs/[slug]/events/[id]/seva">,
) {
  setPageLocale("gu");
  return (
    <English
      {...(props as unknown as PageProps<"/mandirs/[slug]/events/[id]/seva">)}
    />
  );
}
