import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/my/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// My Toran in Gujarati.
export default function GujaratiMyToran() {
  setPageLocale("gu");
  return <English />;
}
