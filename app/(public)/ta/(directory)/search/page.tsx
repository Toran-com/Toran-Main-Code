import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/search/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// Search in Tamil.
export default function TamilSearch(props: PageProps<"/ta/search">) {
  setPageLocale("ta");
  return <English {...props} />;
}
