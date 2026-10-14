import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, Card, quietButtonClass } from "@/components/ui";
import { pageMetadata } from "@/lib/site";

// For mandir committees: what Toran does for them, that it's free, and
// how to start. The page to link to from outreach emails.

export const metadata: Metadata = pageMetadata(
  "For mandir committees",
  "Toran puts your mandir's events where families can find and share them, and helps with your seva rota. Free for mandirs.",
);

const HELPS = [
  {
    title: "Your events, where families look",
    body: "Every mandir has its own page on Toran with what's coming up. Families find it by postcode and share each event on WhatsApp in one tap.",
  },
  {
    title: "No new work: send what you already make",
    body: "Forward your patrika or poster, the same one you share on WhatsApp, and we type it up. A committee member checks it before it goes live.",
  },
  {
    title: "A seva rota for your volunteers",
    body: "List the roles and shifts an event needs, and Toran writes the message for your volunteers' WhatsApp group.",
  },
  {
    title: "Print it for the noticeboard",
    body: "A one-page notice of what's on, with a QR code that always shows the latest, for the noticeboard or to hand out.",
  },
  {
    title: "In English and Gujarati",
    body: "Give an event's name and description in Gujarati too, and families see both.",
  },
];

export default function ForMandirsPage() {
  return (
    <>
      <PageHeading
        title="For mandir committees"
        intro="Toran puts your mandir's events where families can find them, and helps with your seva rota. It's free for mandirs."
      />

      <ul className="rise-list grid gap-4 sm:grid-cols-2">
        {HELPS.map((h) => (
          <li
            key={h.title}
            className="border-line bg-surface lift shadow-card flex flex-col gap-2 rounded-2xl border p-5"
          >
            <h2 className="text-xl font-bold">{h.title}</h2>
            <p className="text-muted">{h.body}</p>
          </li>
        ))}
      </ul>

      <Card>
        <h2 className="text-2xl font-bold">See it first</h2>
        <p>
          A made-up mandir shows what families see and what the committee sees,
          including a seva rota.
        </p>
        <Link href="/demo" className={`${quietButtonClass} self-start`}>
          Try the example
        </Link>
      </Card>

      <section aria-labelledby="start" className="flex flex-col gap-4">
        <h2 id="start" className="font-display text-3xl font-bold">
          How to start
        </h2>
        <ol className="flex list-decimal flex-col gap-3 pl-6">
          <li>
            <Link href="/mandirs" className="text-peacock underline">
              Find your mandir
            </Link>
            . Most UK mandirs already have a page with their address and
            website.
          </li>
          <li>
            Choose &ldquo;Look after this page&rdquo; and log in with your
            email. We check with the mandir that you&apos;re on the committee,
            usually within a few days.
          </li>
          <li>
            Add your events, or forward your patrika to the WhatsApp number in
            our email to you and we&apos;ll type it up for you to check.
          </li>
        </ol>
        <Link
          href="/mandirs"
          className={`${buttonClass} sm:w-auto sm:self-start`}
        >
          Find your mandir
        </Link>
      </section>

      <Card>
        <h2 className="text-2xl font-bold">
          What we keep, and what we don&apos;t
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Families don&apos;t need an account to see your events.</li>
          <li>
            Only events and your mandir&apos;s public details are shown. Your
            committee&apos;s contact details are never public.
          </li>
          <li>
            Your committee can correct or remove your events at any time, and
            ask us to change anything else on your page.
          </li>
        </ul>
      </Card>
    </>
  );
}
