import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/whats-on/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The whats-on page in Tamil.
export default function TamilWhatsOn(props: PageProps<"/ta/whats-on">) {
  setPageLocale("ta");
  return <English {...(props as unknown as PageProps<"/whats-on">)} />;
}
