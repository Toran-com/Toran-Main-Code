import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/live/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The Live now page in Hindi.
export default function HindiLive() {
  setPageLocale("hi");
  return <English />;
}
