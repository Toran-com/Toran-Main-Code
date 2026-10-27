import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/mandirs/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The mandirs page in Hindi.
export default function HindiMandirs() {
  setPageLocale("hi");
  return <English />;
}
