import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/seva/[id]/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/ta/mandirs/[slug]/seva/[id]">,
): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata(
    props as unknown as PageProps<"/mandirs/[slug]/seva/[id]">,
  );
}

// The mandirs/[slug]/seva/[id] page in Tamil.
export default function TamilOwnSeva(
  props: PageProps<"/ta/mandirs/[slug]/seva/[id]">,
) {
  setPageLocale("ta");
  return (
    <English
      {...(props as unknown as PageProps<"/mandirs/[slug]/seva/[id]">)}
    />
  );
}
