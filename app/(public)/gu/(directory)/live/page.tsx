import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/live/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The Live now page in Gujarati.
export default function GujaratiLive() {
  setPageLocale("gu");
  return <English />;
}
