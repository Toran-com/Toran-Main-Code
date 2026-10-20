import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeading } from "@/components/public-shell";
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
    body: "Read from the mandir's own website, which Toran checks once a night.",
  },
  {
    label: "From a poster or message",
    body: "A poster or patrika sent to Toran, typed up and then checked.",
  },
  {
    label: "Sent in by a visitor",
    body: "Someone told us about it with the “Tell us about an event” form.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeading
        title="About Toran"
        intro="Toran brings together what's on at Hindu mandirs across the UK, so families can find it and mandir committees can share it."
      />

      <section aria-labelledby="why" className="flex flex-col gap-3">
        <h2 id="why" className="font-display text-2xl font-bold">
          Why Toran
        </h2>
        <p className="max-w-prose">
          Mandirs share their programmes on posters, in WhatsApp groups and on
          their own websites. That works for the people already in the group,
          but there&apos;s no one place to see what&apos;s on near you, or which
          mandirs are marking a festival. Toran is that place, and it gives
          committees simple tools to keep their page right and fill their seva
          rota.
        </p>
      </section>

      <section aria-labelledby="sources" className="flex flex-col gap-3">
        <h2 id="sources" className="font-display text-2xl font-bold">
          Where the listings come from
        </h2>
        <p className="max-w-prose">
          Every event says where it came from. Nothing from a website, a poster
          or a visitor goes on the site until the mandir&apos;s committee, or
          Toran, has checked it.
        </p>
        <ul className="flex flex-col gap-3">
          {SOURCES.map((s) => (
            <li key={s.label} className="flex flex-col gap-1">
              <span>
                <Badge tone="peacock">{s.label}</Badge>
              </span>
              <span className="text-muted">{s.body}</span>
            </li>
          ))}
        </ul>
        <p className="max-w-prose">
          Festival dates come from published panchangs. A date marked{" "}
          <Badge tone="marigold">Date not yet checked</Badge> hasn&apos;t been
          checked against a second calendar yet, and mandirs following a
          different calendar may mark a festival on another day. Always check
          with the mandir before you travel.
        </p>
      </section>

      <section aria-labelledby="free" className="flex flex-col gap-3">
        <h2 id="free" className="font-display text-2xl font-bold">
          Free, and kept small
        </h2>
        <ul className="flex max-w-prose list-disc flex-col gap-2 pl-6">
          <li>Free for families and for mandirs.</li>
          <li>
            No adverts, no tracking cookies, and we never sell or share data for
            marketing.
          </li>
          <li>
            You don&apos;t need an account to look at anything. Committee
            members log in with their email address.
          </li>
          <li>
            We ask for as little as we can: you can take a seva slot without
            giving your name.
          </li>
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
        <h2 id="who" className="font-display text-2xl font-bold">
          Who runs it
        </h2>
        <p className="max-w-prose">
          Toran is a small, independent project. It isn&apos;t part of any one
          mandir, sampradaya or organisation, and it aims to list every Hindu
          mandir in the UK. It&apos;s being tested with mandir committees now
          and opens in 2027.
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
