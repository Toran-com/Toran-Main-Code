import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/plan/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("gu");
  return englishMetadata();
}

// The family's plan in Gujarati.
export default function GujaratiPlan(props: PageProps<"/gu/plan">) {
  setPageLocale("gu");
  return <English {...props} />;
}
