import type { Metadata } from "next";
import Home from "@/app/(public)/page";
import { setPageLocale } from "@/lib/i18n/page";

export const metadata: Metadata = { alternates: { canonical: "/gu" } };

// The home page in Gujarati.
export default function GujaratiHome() {
  setPageLocale("gu");
  return <Home />;
}
