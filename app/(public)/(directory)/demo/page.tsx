import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/copy-text";
import { Badge } from "@/components/public-shell";
import { Card, Notice, quietButtonClass } from "@/components/ui";
import {
  demoEvents,
  demoMandir,
  demoRota,
  demoRotaEvent,
  demoRotaMessage,
} from "@/lib/demo";
import { pageMetadata } from "@/lib/site";

// A made-up mandir to show committees what Toran does: the page families
// see, and the seva rota the committee sends to its volunteers. Static,
// with no database, so it works before anything else is set up.

// Made-up content, so search engines shouldn't list it even after launch.
export const metadata: Metadata = {
  ...pageMetadata(
    "Try it",
    "See what a mandir's page and seva rota look like on Toran, using a made-up mandir.",
  ),
  robots: { index: false },
};

export default function DemoPage() {
  return (
    <>
      <Notice>
        This is a sample. The mandir, events and rota are made up to show how
        Toran works.
      </Notice>

      <section aria-labelledby="families" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-muted font-semibold">What families see</p>
          <h1
            id="families"
            className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl"
          >
            {demoMandir.name}
          </h1>
          <p className="text-muted text-xl">
            {demoMandir.town}, {demoMandir.region}
          </p>
          <p>
            <Badge tone="peacock">Run by the mandir&apos;s committee</Badge>
          </p>
        </div>

        <h2 className="font-display text-4xl leading-tight">What&apos;s on</h2>
        <ul className="rise-list flex flex-col gap-3">
          {demoEvents.map((event) => (
            <li key={event.id}>
              <article className="border-line bg-surface lift shadow-card flex flex-col gap-2 rounded-2xl border p-5">
                <p className="text-marigold-ink font-semibold">{event.when}</p>
                <h3
                  className={`text-xl font-bold ${event.cancelled ? "line-through" : ""}`}
                >
                  {event.title}
                </h3>
                {event.cancelled && (
                  <p>
                    <Badge tone="kumkum">Cancelled</Badge>
                  </p>
                )}
                <p>{event.summary}</p>
                {event.note && <p className="text-muted">{event.note}</p>}
                {!event.cancelled && (
                  <p className="text-muted text-base">
                    On the real page, each event has a button to share it on
                    WhatsApp.
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="committee" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-muted font-semibold">What the committee sees</p>
          <h2 id="committee" className="font-display text-4xl leading-tight">
            Seva rota for {demoRotaEvent}
          </h2>
          <p className="text-muted">
            The committee adds roles and shifts, and Toran writes the message
            for the volunteers&apos; WhatsApp group.
          </p>
        </div>
        <ul className="rise-list flex flex-col gap-3">
          {demoRota.map((role) => (
            <li
              key={role.name}
              className="border-line bg-surface lift shadow-card flex flex-col gap-2 rounded-2xl border p-5"
            >
              <h3 className="text-xl font-bold">{role.name}</h3>
              {role.dbs && (
                <p>
                  <Badge tone="marigold">DBS check needed</Badge>
                </p>
              )}
              {role.description && <p>{role.description}</p>}
              <ul className="text-muted flex flex-col gap-1">
                {role.shifts.map((shift) => (
                  <li key={shift.when}>
                    {shift.when}: {shift.needed}{" "}
                    {shift.needed === 1 ? "person" : "people"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <Card>
          <h3 className="text-xl font-bold">The message for WhatsApp</h3>
          <pre className="bg-sunk rounded-xl p-4 font-sans text-base whitespace-pre-wrap">
            {demoRotaMessage()}
          </pre>
          <CopyText text={demoRotaMessage()} label="Copy the message" />
        </Card>
      </section>

      <section aria-labelledby="how" className="flex flex-col gap-4">
        <h2 id="how" className="font-display text-4xl leading-tight">
          How it works for your mandir
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-6">
          <li>
            Send us your patrika or event poster, the same one you already share
            on WhatsApp.
          </li>
          <li>
            We type it up for your mandir&apos;s page, and a committee member
            checks it before it goes live.
          </li>
          <li>Families find it, and share each event with their own groups.</li>
        </ol>
        <p className="font-semibold">It&apos;s free for mandirs.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/mandirs" className={quietButtonClass}>
            Find your mandir
          </Link>
          <Link href="/whats-on" className={quietButtonClass}>
            See what&apos;s on
          </Link>
        </div>
      </section>
    </>
  );
}
