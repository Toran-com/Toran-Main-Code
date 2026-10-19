import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/whats-on/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The whats-on page in Gujarati.
export default function GujaratiWhatsOn(props: PageProps<"/gu/whats-on">) {
  setPageLocale("gu");
  return <English {...(props as unknown as PageProps<"/whats-on">)} />;
}
