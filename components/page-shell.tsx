import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { SiteHeader } from "@/components/public-shell";

// The narrow card layout used by login, account, committee and admin
// pages, under the site's own header so the main menu is always there.
export function PageShell({
  title,
  wide = false,
  children,
}: {
  title: string;
  // Wider pages for admin lists and forms.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {/* Committee and admin pages have addresses only known on the day
          (/manage/[slug]), and the header's menu reads the address, so it
          arrives with the page rather than being built ahead. */}
      <Suspense fallback={<div className="h-16 sm:h-[4.25rem]" />}>
        <SiteHeader />
      </Suspense>
      <main
        className={`rise mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          {title}
        </h1>
        {children}
        <nav
          aria-label="About Toran"
          className="text-muted mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-6 text-base"
        >
          <Link href="/privacy" prefetch={false} className="underline">
            Privacy
          </Link>
          <Link href="/terms" prefetch={false} className="underline">
            Terms
          </Link>
          <Link href="/contact" prefetch={false} className="underline">
            Contact
          </Link>
        </nav>
      </main>
    </>
  );
}
