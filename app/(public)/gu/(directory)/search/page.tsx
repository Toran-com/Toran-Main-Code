import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/search/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// Search in Gujarati.
export default function GujaratiSearch(props: PageProps<"/gu/search">) {
  setPageLocale("gu");
  return <English {...props} />;
}
