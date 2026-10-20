import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { Card } from "@/components/ui";
import { CONTACT_EMAIL, pageMetadata } from "@/lib/site";

// Every way to reach Toran, by what you want to do, so people find the
// quickest route rather than writing in.

export const metadata: Metadata = pageMetadata(
  "Contact Toran",
  "How to reach Toran: correct or remove something, tell us about an event, or ask about your mandir's page.",
  "/contact",
);

export default function ContactPage() {
  const ways = [
    {
      title: "Something on Toran is wrong",
      body: "A wrong time, a mandir that has moved, or a page you'd like taken down. Mandirs that would rather not be listed are hidden the same day.",
      href: "/corrections",
      link: "Ask us to correct or remove it",
    },
    {
      title: "You know about an event",
      body: "Open the mandir's page and choose “Tell us about an event”. The committee or Toran checks it before it goes on the site.",
      href: "/mandirs",
      link: "Find the mandir",
    },
    {
      title: "You're on a mandir committee",
      body: "Look after your mandir's page for free: add events, keep them right, and run your seva rota.",
      href: "/for-mandirs",
      link: "See how it works",
    },
  ];
  return (
    <>
      <PageHeading
        title="Contact Toran"
        intro="The quickest way to reach us depends on what you need."
      />
      <ul className="flex flex-col gap-4">
        {ways.map((w) => (
          <li key={w.title}>
            <Card>
              <h2 className="text-xl font-bold">{w.title}</h2>
              <p className="text-muted">{w.body}</p>
              <Link
                href={w.href}
                className="text-peacock self-start font-semibold underline"
              >
                {w.link} →
              </Link>
            </Card>
          </li>
        ))}
      </ul>
      <section aria-labelledby="data" className="flex flex-col gap-3">
        <h2 id="data" className="font-display text-3xl leading-tight">
          Your data
        </h2>
        {CONTACT_EMAIL ? (
          <p className="max-w-prose">
            To see, correct or delete what Toran keeps about you, email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-peacock underline"
            >
              {CONTACT_EMAIL}
            </a>
            . We reply within one month, and it&apos;s free.
          </p>
        ) : (
          <p className="max-w-prose">
            To have personal details taken off a page, use the{" "}
            <Link href="/corrections" className="text-peacock underline">
              correction form
            </Link>{" "}
            and choose &ldquo;Remove someone&apos;s personal details&rdquo;.
            Committee members can leave a mandir&apos;s page at any time from
            the committee section of its page.
          </p>
        )}
        <p className="max-w-prose">
          Our{" "}
          <Link href="/privacy" className="text-peacock underline">
            privacy notice
          </Link>{" "}
          explains what we keep and your rights.
        </p>
      </section>
    </>
  );
}
