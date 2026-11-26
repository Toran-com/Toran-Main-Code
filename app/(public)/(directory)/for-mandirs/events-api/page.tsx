import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/public-shell";
import {
  EVENTS_API_PATH,
  MAX_BATCH,
  REQUESTS_PER_WINDOW,
} from "@/lib/events-api";
import { pageMetadata, siteUrl } from "@/lib/site";

// The events API's instructions, for whoever runs a mandir's website or
// booking software (decision 0032). Plain enough for a volunteer who
// built the mandir's site; exact enough for a developer. The committee
// page links here when it makes a key.

export const metadata: Metadata = pageMetadata(
  "Events API for mandir websites",
  "How a mandir's own website or booking software puts its events on Toran automatically, and keeps them up to date.",
  EVENTS_API_PATH,
);

const FIELDS: { name: string; what: ReactNode }[] = [
  { name: "title", what: "Required. The event's name, 2 to 120 characters." },
  {
    name: "date",
    what: "Required. YYYY-MM-DD, from today up to two years ahead.",
  },
  {
    name: "time",
    what: "Start time, HH:MM, 24-hour, UK time. Leave it out for an all-day event.",
  },
  { name: "end_time", what: "HH:MM, later the same day." },
  { name: "summary", what: "Up to 280 characters on what happens." },
  {
    name: "kind",
    what: "One of festival, aarti, bhajan, katha, class, seva, youth, community, other. Guessed from the title if left out.",
  },
  {
    name: "repeat",
    what: "none (the default), daily, weekly, fortnightly, monthly or monthly-last. Repeats for a year, or until…",
  },
  { name: "until", what: "The last date of a repeating event, YYYY-MM-DD." },
  {
    name: "title_gu, summary_gu",
    what: "The same in Gujarati, if you have it.",
  },
  {
    name: "cost_note",
    what: "Up to 80 characters, such as “Free” or “£10, children free”.",
  },
  { name: "booking_required", what: "true if people must book first." },
  { name: "tickets_url", what: "Where to book (a web address)." },
  { name: "link", what: "A page with more details (a web address)." },
  { name: "location_note", what: "Which hall or room, up to 160 characters." },
  {
    name: "venue_name, venue_postcode",
    what: "Both, when it's held away from the mandir.",
  },
  {
    name: "languages",
    what: "Up to four of en, gu, hi, ta, pa, te, bn, mr, kn, ml, sa.",
  },
  {
    name: "status",
    what: "published (the default) or cancelled. A cancelled event stays on the page, marked cancelled.",
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-night text-on-night overflow-x-auto rounded-2xl p-4 text-base leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4"
    >
      <h2 id={`${id}-title`} className="font-display text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function EventsApiPage() {
  const base = `${siteUrl()}/api/v1/events`;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 pb-16">
      <PageHeading
        title="Events API"
        intro="For a mandir's own website or booking software that can send its events to Toran by itself, and change or cancel them when you do. They're published straight away, as confirmed by your mandir. Most mandirs don't need this: their committee presses “Connect your website” and Toran reads the website itself."
      />

      <Section id="key" title="1. Get a key">
        <p>
          Someone on your mandir&apos;s committee makes one on its committee
          page on Toran:{" "}
          <strong>
            Add events → Connect your website → For web developers → Make a key
          </strong>
          . It starts <code>toran_</code> and is shown once. Keep it on your
          server, never in a web page&apos;s code: anyone with it can put events
          on your mandir&apos;s page. If it gets out, the committee stops it
          there and makes another.
        </p>
        <p>Send it with every request:</p>
        <Code>{"Authorization: Bearer toran_…"}</Code>
      </Section>

      <Section id="put" title="2. Put an event on Toran">
        <p>
          Use your own system&apos;s id for the event in the address (letters,
          digits and <code>. _ : @ -</code>, up to 100). The first time, the
          event is added; after that, the same request changes it.
        </p>
        <Code>{`curl -X PUT ${base}/diwali-2026 \\
  -H "Authorization: Bearer $TORAN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Diwali Lakshmi puja",
    "date": "2026-11-08",
    "time": "18:30",
    "end_time": "20:30",
    "summary": "Lakshmi puja, aarti and prasad for all the family.",
    "kind": "festival",
    "languages": ["gu", "en"]
  }'`}</Code>
        <p>
          Toran answers <code>201</code> when it&apos;s added and{" "}
          <code>200</code> when it&apos;s changed, with its address on Toran:
        </p>
        <Code>{`{
  "id": "diwali-2026",
  "toran_id": "…",
  "url": "${siteUrl()}/mandirs/your-mandir/events/…",
  "status": "published",
  "created": true
}`}</Code>
      </Section>

      <Section id="fields" title="What you can send">
        <dl className="border-line divide-line flex flex-col divide-y rounded-2xl border">
          {FIELDS.map((f) => (
            <div
              key={f.name}
              className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6"
            >
              <dt className="font-mono font-semibold sm:w-56 sm:shrink-0">
                {f.name}
              </dt>
              <dd>{f.what}</dd>
            </div>
          ))}
        </dl>
        <p>
          Anything else is ignored. Don&apos;t send people&apos;s names, phone
          numbers or email addresses: Toran&apos;s pages are public.
        </p>
      </Section>

      <Section id="cancel" title="3. Cancel or remove an event">
        <p>
          To show it as cancelled, send it again with{" "}
          <code>&quot;status&quot;: &quot;cancelled&quot;</code>. To take it off
          Toran altogether:
        </p>
        <Code>{`curl -X DELETE ${base}/diwali-2026 \\
  -H "Authorization: Bearer $TORAN_KEY"`}</Code>
        <p>
          Toran answers <code>204</code>, or <code>404</code> if it has no event
          with that id.
        </p>
      </Section>

      <Section id="many" title="Many at once, and what's there">
        <p>
          Send up to {MAX_BATCH} events in one request, each with its{" "}
          <code>id</code>. Each gets its own result, with the status it would
          have had on its own (<code>http_status</code>); the request answers{" "}
          <code>207</code> if any failed.
        </p>
        <Code>{`curl -X POST ${base} \\
  -H "Authorization: Bearer $TORAN_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "events": [
    { "id": "sat-bhajan-1", "title": "Bhajan sandhya", "date": "2026-11-14", "time": "19:00" },
    { "id": "navratri-garba", "title": "Navratri garba", "date": "2027-10-01", "time": "20:00",
      "repeat": "daily", "until": "2027-10-09" }
  ] }'`}</Code>
        <p>
          <code>GET {base}</code> lists the events your system has put on Toran,
          with their ids and addresses.
        </p>
      </Section>

      <Section id="rules" title="Good to know">
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            Times are UK time. An event with no <code>time</code> is all day.
          </li>
          <li>
            If the committee has already put the same event on Toran (the same
            name on the same day), your system takes it over rather than adding
            a copy.
          </li>
          <li>
            A problem with an event answers <code>422</code>, naming the{" "}
            <code>field</code> and what&apos;s wrong. A missing or stopped key
            answers <code>401</code>.
          </li>
          <li>
            Up to {REQUESTS_PER_WINDOW} requests in ten minutes for each key;
            after that, <code>429</code>. Syncing when something changes, or
            once an hour, is plenty.
          </li>
          <li>
            The committee can still change or cancel any event on Toran; your
            system&apos;s next change to that event replaces theirs.
          </li>
        </ul>
        <p>
          Questions?{" "}
          <Link
            href="/contact"
            className="text-peacock font-semibold underline"
          >
            Get in touch
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}
