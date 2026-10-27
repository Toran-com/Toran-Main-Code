import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/my/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// My Toran in Hindi.
export default function HindiMyToran() {
  setPageLocale("hi");
  return <English />;
}
