import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/regular/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The classes and regular groups page in Gujarati.
export default function GujaratiRegular(props: PageProps<"/gu/regular">) {
  setPageLocale("gu");
  return <English {...(props as unknown as PageProps<"/regular">)} />;
}
