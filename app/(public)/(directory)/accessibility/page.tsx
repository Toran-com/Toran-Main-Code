import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { pageMetadata } from "@/lib/site";

// How accessible Toran is, what we check, what we know isn't right yet,
// and how to tell us about a problem.

export const metadata: Metadata = pageMetadata(
  "Accessibility",
  "How Toran is built to be easy to read and use, what we check, and how to tell us about a problem.",
  "/accessibility",
);

export default function AccessibilityPage() {
  return (
    <>
      <PageHeading
        title="Accessibility"
        intro="Toran should be easy to read and use for everyone, including older family members and people using a screen reader, a keyboard or a magnifier."
      />

      <section aria-labelledby="aim" className="flex flex-col gap-3">
        <h2 id="aim" className="font-display text-3xl leading-tight">
          What we aim for
        </h2>
        <p className="max-w-prose">
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at
          level AA across the public pages and the pages committees use.
        </p>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          <li>Text is at least 18 pixels, and you can zoom to 400%.</li>
          <li>
            <strong>Read aloud</strong> on mandir and event pages reads the
            details out with your phone&apos;s own voice, in English or
            Gujarati. Nothing is sent anywhere.
          </li>
          <li>
            Everything works with a keyboard, and with screen readers such as
            VoiceOver and NVDA.
          </li>
          <li>
            Colours have strong contrast, in light and dark mode, and nothing
            relies on colour alone.
          </li>
          <li>
            If your device asks for less motion, the page animations stop.
          </li>
          <li>
            The map of mandirs has a list view with the same mandirs, for anyone
            who finds maps hard to use.
          </li>
          <li>
            Every change to the site is checked automatically for common
            accessibility problems before it goes live.
          </li>
        </ul>
      </section>

      <section aria-labelledby="known" className="flex flex-col gap-3">
        <h2 id="known" className="font-display text-3xl leading-tight">
          What we know isn&apos;t right yet
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          <li>
            The map itself is hard to use with a screen reader. Use the list
            view instead; it has everything the map has.
          </li>
          <li>
            Event titles and descriptions are written by mandirs, so some may
            use abbreviations or capital letters that screen readers read oddly.
          </li>
          <li>
            The Gujarati version of the site is a draft and isn&apos;t available
            yet.
          </li>
        </ul>
      </section>

      <section aria-labelledby="tell-us" className="flex flex-col gap-3">
        <h2 id="tell-us" className="font-display text-3xl leading-tight">
          Tell us about a problem
        </h2>
        <p className="max-w-prose">
          If something on Toran is hard to read or use, please{" "}
          <Link href="/corrections" className="text-peacock underline">
            tell us what and where
          </Link>
          . We&apos;ll fix it, or tell you another way to get the same
          information.
        </p>
        <p className="text-muted text-base">Last checked: October 2026.</p>
      </section>
    </>
  );
}
