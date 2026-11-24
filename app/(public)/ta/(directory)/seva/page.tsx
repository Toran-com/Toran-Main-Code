import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/seva/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The seva page in Tamil.
export default function TamilSeva(props: PageProps<"/ta/seva">) {
  setPageLocale("ta");
  return <English {...(props as unknown as PageProps<"/seva">)} />;
}
