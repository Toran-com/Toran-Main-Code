import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/seva/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The seva page in Gujarati.
export default function GujaratiSeva(props: PageProps<"/gu/seva">) {
  setPageLocale("gu");
  return <English {...(props as unknown as PageProps<"/seva">)} />;
}
