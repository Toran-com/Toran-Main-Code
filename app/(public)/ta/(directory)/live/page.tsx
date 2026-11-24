import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/live/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The Live now page in Tamil.
export default function TamilLive() {
  setPageLocale("ta");
  return <English />;
}
