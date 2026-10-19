import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/mandirs/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The mandirs page in Gujarati.
export default function GujaratiMandirs() {
  setPageLocale("gu");
  return <English />;
}
