import type { Metadata } from "next";
import English, {
  generateMetadata as englishMetadata,
} from "@/app/(public)/(directory)/plan/page";
import { setPageLocale } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  setPageLocale("ta");
  return englishMetadata();
}

// The family's plan in Tamil.
export default function TamilPlan(props: PageProps<"/ta/plan">) {
  setPageLocale("ta");
  return <English {...props} />;
}
