import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/first-visit/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The first-visit guide in Hindi.
export default function HindiFirstVisit() {
  setPageLocale("hi");
  return <English />;
}
