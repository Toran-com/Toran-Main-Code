import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/regular/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The classes and regular groups page in Hindi.
export default function HindiRegular(props: PageProps<"/hi/regular">) {
  setPageLocale("hi");
  return <English {...(props as unknown as PageProps<"/regular">)} />;
}
