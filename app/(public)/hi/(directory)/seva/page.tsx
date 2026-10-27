import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/seva/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The seva page in Hindi.
export default function HindiSeva(props: PageProps<"/hi/seva">) {
  setPageLocale("hi");
  return <English {...(props as unknown as PageProps<"/seva">)} />;
}
