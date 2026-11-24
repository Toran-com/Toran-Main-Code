import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/regular/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The classes and regular groups page in Tamil.
export default function TamilRegular(props: PageProps<"/ta/regular">) {
  setPageLocale("ta");
  return <English {...(props as unknown as PageProps<"/regular">)} />;
}
