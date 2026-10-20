import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/site";

// The privacy notice, from docs/legal/privacy-notice.md.

export const metadata: Metadata = pageMetadata(
  "Privacy notice",
  "What Toran keeps about you, why, and your rights. Browsing needs no account and there are no tracking cookies.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <LegalPage
      doc="privacy-notice"
      title="Privacy notice"
      intro="What Toran keeps about you, why, who else sees it, and how to ask us to change or delete it."
    />
  );
}
