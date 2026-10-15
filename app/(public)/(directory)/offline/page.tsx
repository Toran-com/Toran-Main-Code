import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { pageMetadata } from "@/lib/site";

// Shown by the app (public/sw.js) when there's no signal and the page
// hasn't been opened before.
export const metadata: Metadata = {
  ...pageMetadata("You're offline"),
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <>
      <PageHeading
        title="You're offline"
        intro="This page needs a connection. Pages you've opened recently still work without one."
      />
      <ul className="flex flex-col gap-2 text-lg">
        <li>
          <Link
            href="/whats-on"
            className="text-peacock font-semibold underline"
          >
            What&apos;s on
          </Link>
        </li>
        <li>
          <Link
            href="/mandirs"
            className="text-peacock font-semibold underline"
          >
            Mandirs
          </Link>
        </li>
        <li>
          <Link
            href="/festivals"
            className="text-peacock font-semibold underline"
          >
            Festivals
          </Link>
        </li>
      </ul>
    </>
  );
}
