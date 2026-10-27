import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/plan/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("hi");
  return englishMetadata();
}

// The family's plan in Hindi.
export default function HindiPlan(props: PageProps<"/hi/plan">) {
  setPageLocale("hi");
  return <English {...props} />;
}
