import Link from "next/link";
import { PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell title="Page not found">
      <p className="text-muted text-lg">
        This page could not be found. It may have moved, or the link may be
        wrong.
      </p>
      <Link href="/" className="text-peacock font-semibold underline">
        Go to the Toran home page
      </Link>
    </PageShell>
  );
}
