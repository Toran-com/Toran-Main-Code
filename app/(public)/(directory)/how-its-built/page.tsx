import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/public-shell";
import { BUILT_FACTS as F } from "@/lib/built-facts";
import { pageMetadata } from "@/lib/site";

// How Toran is built: the quality it's held to, measured, and the parts
// it's made of. For anyone curious, and for engineers judging the work.
// English only, like the other pages about Toran itself.

export const metadata: Metadata = pageMetadata(
  "How Toran is built",
  "The engineering behind Toran: fast on a slow phone, accessible to everyone, private by design, and tested on every change.",
  "/how-its-built",
);

const n = (x: number) => x.toLocaleString("en-GB");

// The headline numbers, each one measured (lib/built-facts.ts).
const SCORES = [
  {
    value: `${F.lighthouse.mobile.accessibility}`,
    label: "Lighthouse accessibility",
    note: "on every page we measure, phone and laptop",
  },
  {
    value: `${F.lighthouse.mobile.performance}+`,
    label: "Lighthouse performance on a slow phone",
    note: `${F.lighthouse.desktop.performance} on a laptop`,
  },
  {
    value: n(F.tests.unit + F.tests.browser + F.tests.withDatabase),
    label: "automated tests on every change",
    note: `${n(F.tests.unit)} unit · ${F.tests.browser} in a browser · ${F.tests.withDatabase} with a real database`,
  },
  {
    value: `${F.budget.totalKb} KB`,
    label: "most a page may download",
    note: `${F.budget.javascriptKb} KB of JavaScript at most, checked by the tests`,
  },
];

// The parts, from the visitor's phone to the database, as a diagram that
// is also a plain list for screen readers.
const LAYERS: {
  title: string;
  parts: { name: string; what: string }[];
}[] = [
  {
    title: "On your phone",
    parts: [
      {
        name: "The website",
        what: "Works offline once opened, installs like an app, three languages, text size and contrast",
      },
      {
        name: "Your choices stay here",
        what: "Mandirs you follow, your plan and your seva are kept on the phone, never sent to us",
      },
    ],
  },
  {
    title: "Vercel, London",
    parts: [
      {
        name: "Next.js 16 and React 19",
        what: "Pages built on the server and saved ahead, so they open fast; TypeScript throughout",
      },
      {
        name: "Nightly job",
        what: "Reads mandirs' own calendars and websites, deletes old data on time",
      },
    ],
  },
  {
    title: "Supabase, London",
    parts: [
      {
        name: "Postgres",
        what: `Row-level security on every table, ${F.migrations} reviewed migrations, ${F.tests.databaseSecurityFiles} files of security tests`,
      },
      {
        name: "Login and files",
        what: "Email links for committees, a second factor for admins, mandir photos",
      },
    ],
  },
  {
    title: "Services",
    parts: [
      {
        name: "Claude (Anthropic)",
        what: "Reads posters into draft events; a person always checks before anything is published",
      },
      {
        name: "Sentry, Resend, GitHub Actions",
        what: "Error reports with personal data removed, email, tests and an hourly uptime check",
      },
    ],
  },
];

const PRINCIPLES: { title: string; body: ReactNode }[] = [
  {
    title: "Accessible to everyone",
    body: "WCAG 2.2 AA, 18px text at the smallest, larger text and higher contrast in one tap, labelled buttons, full keyboard use and screen-reader checks. Automated accessibility scans run on every kind of page, in light and dark.",
  },
  {
    title: "Fast on a slow phone",
    body: `Each page has a download budget (${F.budget.totalKb} KB, ${F.budget.javascriptKb} KB of JavaScript) that the tests enforce, no layout jumps as pages load, and animation that needs no JavaScript at all.`,
  },
  {
    title: "Private by design",
    body: (
      <>
        No tracking cookies. Visitors need no account, and what they follow
        stays on their phone. Database rules decide who sees what, tested for
        every role. See the{" "}
        <Link href="/privacy" className="text-peacock underline">
          privacy notice
        </Link>
        .
      </>
    ),
  },
  {
    title: "Responsible AI",
    body: (
      <>
        AI reads a poster into a draft event; it never publishes on its own, and
        a person always checks first. Only the picture is sent, never who sent
        it, and it isn&apos;t kept.{" "}
        <Link href="/demo/poster" className="text-peacock underline">
          Watch it read a poster
        </Link>
        .
      </>
    ),
  },
  {
    title: "Reliable",
    body: "An hourly check of the live site and of the nightly job, error reports, daily backups with a practised restore, and a written plan for if anything goes wrong.",
  },
  {
    title: "Every change reviewed",
    body: `Each change is a pull request that must pass type checks, linting and every test before it can go live. ${F.decisions} written decision records explain the choices, and a design system keeps every page consistent.`,
  },
];

export default function HowItsBuiltPage() {
  return (
    <div className="page-wide flex flex-col gap-16 sm:gap-24">
      <PageHeading
        title="How Toran is built"
        intro="Toran is for families of every age, on whatever phone they have. That sets the bar: fast on a slow connection, easy for everyone to use, private by design, and tested on every change."
      />

      <section aria-labelledby="numbers" className="flex flex-col gap-6">
        <h2 id="numbers" className="sr-only">
          The numbers
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCORES.map((s) => (
            <li
              key={s.label}
              className="reveal bg-night text-on-night flex flex-col gap-2 rounded-3xl p-6 sm:p-7"
            >
              <span className="font-display text-night-accent text-6xl leading-none">
                {s.value}
              </span>
              <span className="text-lg font-semibold">{s.label}</span>
              <span className="text-night-muted text-base">{s.note}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted text-base">
          Measured {F.measuredOn} with Lighthouse 12 on a production build with
          real events: the lowest score from two runs of the home page,
          What&apos;s on, a mandir&apos;s page, the festivals page and this one,
          on Lighthouse&apos;s slow phone and on a laptop.
        </p>
      </section>

      <section aria-labelledby="parts" className="flex flex-col gap-8">
        <h2
          id="parts"
          className="font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        >
          The parts
        </h2>
        <ol className="grid gap-4 lg:grid-cols-4">
          {LAYERS.map((layer, i) => (
            <li
              key={layer.title}
              className="reveal border-line bg-surface shadow-card relative flex flex-col gap-4 rounded-3xl border p-6"
            >
              <p className="text-peacock text-base font-bold tracking-[0.08em] uppercase">
                <span aria-hidden="true">{i + 1} · </span>
                {layer.title}
              </p>
              <ul className="flex flex-col gap-4">
                {layer.parts.map((p) => (
                  <li key={p.name} className="flex flex-col gap-1">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-muted text-base">{p.what}</span>
                  </li>
                ))}
              </ul>
              {i < LAYERS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="bg-night text-night-accent absolute -bottom-5 left-1/2 z-10 grid size-8 -translate-x-1/2 place-items-center rounded-full text-lg lg:top-1/2 lg:-right-5 lg:bottom-auto lg:left-auto lg:translate-x-0 lg:-translate-y-1/2"
                >
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">→</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="principles" className="flex flex-col gap-8">
        <h2
          id="principles"
          className="font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        >
          What it&apos;s held to
        </h2>
        <ul className="grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="reveal flex flex-col gap-3">
              <h3 className="font-display text-3xl leading-tight">{p.title}</h3>
              <p className="text-muted leading-relaxed">{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-muted max-w-prose">
        Toran is built by its founders with Claude Code, Anthropic&apos;s AI
        coding agent: the founders set the direction, make every decision and
        review every change; the agent writes and tests the code. Questions
        about how it works?{" "}
        <Link href="/contact" className="text-peacock underline">
          Get in touch
        </Link>
        .
      </p>
    </div>
  );
}
