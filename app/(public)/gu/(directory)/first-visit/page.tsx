import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/first-visit/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The first-visit guide in Gujarati.
export default function GujaratiFirstVisit() {
  setPageLocale("gu");
  return <English />;
}
