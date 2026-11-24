import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
  generateStaticParams,
} from "@/app/(public)/(directory)/mandirs/[slug]/events/[id]/seva/page";
import { setPageLocale } from "@/lib/i18n/page";

export const ensureStatic = "navigation";

export { generateStaticParams };

export async function generateMetadata(
  props: PageProps<"/ta/mandirs/[slug]/events/[id]/seva">,
): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata(
    props as unknown as PageProps<"/mandirs/[slug]/events/[id]/seva">,
  );
}

// The mandirs/[slug]/events/[id]/seva page in Tamil.
export default function TamilSeva(
  props: PageProps<"/ta/mandirs/[slug]/events/[id]/seva">,
) {
  setPageLocale("ta");
  return (
    <English
      {...(props as unknown as PageProps<"/mandirs/[slug]/events/[id]/seva">)}
    />
  );
}
