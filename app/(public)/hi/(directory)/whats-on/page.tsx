import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/whats-on/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The whats-on page in Hindi.
export default function HindiWhatsOn(props: PageProps<"/hi/whats-on">) {
  setPageLocale("hi");
  return <English {...(props as unknown as PageProps<"/whats-on">)} />;
}
