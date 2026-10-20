import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

// The terms of use, from docs/legal/terms.md.

export const metadata: Metadata = pageMetadata(
  "Terms of use",
  "The rules for using Toran and for mandir committees adding their events.",
  "/terms",
);

export default function TermsPage() {
  return (
    <LegalPage
      doc="terms"
      title="Terms of use"
      intro="The rules for using Toran, and for mandir committees who look after a mandir's page."
    />
  );
}
