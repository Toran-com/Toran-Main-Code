import type { Metadata } from "next";
import Link from "next/link";
import { PosterDemo } from "@/components/poster-demo";
import { PageHeading } from "@/components/public-shell";
import { DEMO_POSTERS } from "@/lib/poster-demo";
import { posterReadingOn } from "@/lib/poster-reader";
import { pageMetadata } from "@/lib/site";

// "Watch AI read a poster": the poster reading committees and Toran use
// (decision 0018), shown on made-up posters so anyone can try it. English
// only, like the other pages about how Toran works.

// Made-up posters, so search engines shouldn't list it.
export const metadata: Metadata = {
  ...pageMetadata(
    "Watch AI read a poster",
    "See how Toran turns a mandir's poster into draft events with AI, and why a person always checks them before anything is published.",
    "/demo/poster",
  ),
  robots: { index: false },
};

export default function PosterDemoPage() {
  return (
    <div className="flex flex-col gap-12">
      <PageHeading
        title="Watch AI read a poster"
        intro="Most mandirs share their programme as a poster on WhatsApp, often in Gujarati. Toran uses Claude, Anthropic's AI, to turn a poster into draft events, and a person checks every one before it goes live. Try it on a sample mandir's posters."
      />
      <PosterDemo
        posters={DEMO_POSTERS.map(({ id, name, about, alt }) => ({
          id,
          name,
          about,
          alt,
        }))}
        on={posterReadingOn()}
      />
      <section aria-labelledby="rules" className="flex flex-col gap-4">
        <h2 id="rules" className="font-display text-3xl leading-tight">
          The rules it follows
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          <li>
            It only makes drafts. Nothing is published until the mandir&apos;s
            committee, or Toran, has checked it.
          </li>
          <li>
            Only the picture is sent, never who sent it, and Toran doesn&apos;t
            keep it.
          </li>
          <li>
            It&apos;s told to leave out people&apos;s names, phone numbers and
            addresses, and to make nothing up: a poster with no dates gives no
            events.
          </li>
          <li>
            On this page you can only try Toran&apos;s own sample posters, so no
            one&apos;s details are ever sent.
          </li>
        </ul>
        <p className="text-muted max-w-prose">
          The sample mandir, its posters and the people on them are made up.
          More on{" "}
          <Link href="/how-its-built" className="text-peacock underline">
            how Toran is built
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
