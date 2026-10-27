import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/search/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// Search in Hindi.
export default function HindiSearch(props: PageProps<"/hi/search">) {
  setPageLocale("hi");
  return <English {...props} />;
}
