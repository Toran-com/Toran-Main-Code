import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { Card } from "@/components/ui";
import { pageMetadata } from "@/lib/site";

// What Toran is, where its listings come from, and how it's run. The page
// to send anyone who asks "who are you?".

export const metadata: Metadata = pageMetadata(
  "About Toran",
  "Toran brings together what's on at Hindu mandirs across the UK, so families can find it and committees can share it. Free, with no ads or tracking.",
  "/about",
);

const SOURCES = [
  {
    label: "Confirmed by the mandir",
    body: "The mandir's committee added the event, or checked it, on Toran.",
  },
  {
    label: "From the mandir's website",
    body: "Read from the mandir's own website each night.",
  },
  {
    label: "From a poster or message",
    body: "A poster or patrika sent to Toran, then checked.",
  },
  {
    label: "Sent in by a visitor",
    body: "Someone told us with the “Tell us about an event” form.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeading
        title="About Toran"
        intro="What's on at Hindu mandirs across the UK, in one place."
      />

      <section aria-labelledby="why" className="flex flex-col gap-3">
        <h2 id="why" className="font-display text-3xl leading-tight">
          Why Toran
        </h2>
        <p className="max-w-prose">
          Mandirs share their programmes on posters, in WhatsApp groups and on
          their websites, but there&apos;s no one place to see what&apos;s on
          near you. Toran is that place.
        </p>
      </section>

      <section aria-labelledby="sources" className="flex flex-col gap-3">
        <h2 id="sources" className="font-display text-3xl leading-tight">
          Where the listings come from
        </h2>
        <p className="max-w-prose">
          Every event says where it came from, and is checked by the
          mandir&apos;s committee or Toran before it goes on the site.
        </p>
        <ul className="flex flex-col gap-3">
          {SOURCES.map((s) => (
            <li key={s.label} className="flex flex-col gap-1">
              <span className="font-semibold">{s.label}</span>
              <span className="text-muted">{s.body}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-prose">
          Festival dates come from published panchangs. Some mandirs follow a
          different calendar, so check with yours before you travel.
        </p>
      </section>

      <section aria-labelledby="free" className="flex flex-col gap-3">
        <h2 id="free" className="font-display text-3xl leading-tight">
          Free, and kept small
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          <li>Free for families and for mandirs.</li>
          <li>No adverts, no tracking cookies, and no selling data.</li>
          <li>No account needed to look at anything.</li>
          <li>A seva slot needs no name.</li>
        </ul>
        <p>
          The details are in our{" "}
          <Link href="/privacy" className="text-peacock underline">
            privacy notice
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-peacock underline">
            terms
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="who" className="flex flex-col gap-3">
        <h2 id="who" className="font-display text-3xl leading-tight">
          Who runs it
        </h2>
        <p className="max-w-prose">
          A small, independent project, not part of any one mandir, sampradaya
          or organisation. It opens in 2027.
        </p>
      </section>

      <Card>
        <h2 className="text-xl font-bold">Get in touch</h2>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              href="/for-mandirs"
              className="text-peacock font-semibold underline"
            >
              On a mandir committee? See what Toran does for you
            </Link>
          </li>
          <li>
            <Link
              href="/corrections"
              className="text-peacock font-semibold underline"
            >
              Something wrong? Ask us to correct or remove it
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="text-peacock font-semibold underline"
            >
              Other ways to contact us
            </Link>
          </li>
        </ul>
      </Card>
    </>
  );
}
