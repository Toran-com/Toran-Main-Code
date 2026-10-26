import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { RangoliMark, Toran } from "@/components/ornaments";
import { buttonClass, quietButtonClass } from "@/components/ui";
import { pageMetadata } from "@/lib/site";

// For mandir committees: what Toran does for them, that it's free, and
// how to start. The page to link to from outreach emails. Its bold moment
// is the three steps, on deep peacock under the toran.

export const metadata: Metadata = pageMetadata(
  "For mandir committees",
  "Toran puts your mandir's events where families can find and share them, and helps with your seva rota. Free for mandirs.",
  "/for-mandirs",
);

const icon = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "text-peacock size-8 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const HELPS: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Your events, where families look",
    body: "Families find your page by postcode and share events on WhatsApp.",
    icon: (
      <svg {...icon}>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
        <circle cx="12" cy="10" r="2.3" />
      </svg>
    ),
  },
  {
    title: "No new work: send what you already make",
    body: "Forward your patrika or poster. You check it before it goes live.",
    icon: (
      <svg {...icon}>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M15 3v4h4M9 12h7M9 16h7" />
      </svg>
    ),
  },
  {
    title: "A seva rota for your volunteers",
    body: "List the roles and shifts. Toran writes the WhatsApp message.",
    icon: (
      <svg {...icon}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
  },
  {
    title: "Print it for the noticeboard",
    body: "A one-page notice with a QR code to the latest.",
    icon: (
      <svg {...icon}>
        <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
        <path d="M7 14h10v7H7z" />
      </svg>
    ),
  },
  {
    title: "In English and Gujarati",
    body: "Families see both.",
    icon: (
      <span
        aria-hidden="true"
        lang="gu"
        className="font-display text-peacock w-8 shrink-0 text-center text-[1.625rem] leading-8"
      >
        ગુ
      </span>
    ),
  },
  {
    title: "Confirmed by the mandir",
    body: "One tap on “Still on” shows families it's checked.",
    icon: (
      <svg {...icon}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    ),
  },
];

export default function ForMandirsPage() {
  return (
    <div className="page-wide flex flex-col gap-16 sm:gap-24">
      <section className="flex flex-wrap items-center gap-x-16 gap-y-12 pt-2 sm:pt-8">
        <div className="rise flex min-w-0 flex-[1_1_30rem] flex-col gap-6">
          <h1 className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
            For mandir committees
          </h1>
          <p className="font-display text-[3.25rem] leading-[0.98] tracking-tight sm:text-7xl lg:text-[5.5rem]">
            Your events, <em className="text-peacock">where families look.</em>
          </p>
          <p className="text-muted max-w-xl text-lg leading-relaxed sm:text-xl">
            Events where families find them, and help with your seva rota. Free
            for mandirs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/mandirs" className={`${buttonClass} sm:w-auto`}>
              Find your mandir
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/demo" className={quietButtonClass}>
              Try the example
            </Link>
          </div>
        </div>

        {/* A committee's home on a phone: what Toran asks of them. */}
        <div className="relative flex min-w-0 flex-[1_1_20rem] justify-center">
          <span
            aria-hidden="true"
            className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-[0.14]"
          >
            <RangoliMark className="size-[30rem]" />
          </span>
          <figure className="relative w-full max-w-[21rem]">
            <div
              aria-hidden="true"
              className="rounded-[2.75rem] bg-[#1b1a2c] p-3 shadow-[0_40px_80px_rgba(27,26,44,0.25)]"
            >
              <div className="bg-bg flex flex-col rounded-[2.25rem] px-5 pt-7 pb-5">
                <span className="text-muted text-base">
                  Shree Example Mandir
                </span>
                <span className="font-display text-[2rem] leading-tight">
                  What needs doing
                </span>
                <ul className="divide-line mt-2 flex flex-col divide-y">
                  <li className="flex flex-col items-start gap-2 py-3.5">
                    <span className="font-semibold">
                      Check 2 posters sent in for your mandir
                    </span>
                    <span className="bg-peacock text-on-peacock rounded-full px-4 py-1 text-base font-semibold">
                      Check them
                    </span>
                  </li>
                  <li className="flex flex-col gap-1 py-3.5">
                    <span className="font-semibold">
                      A festival is coming up
                    </span>
                    <span className="text-muted">
                      Add your programme so families can find it.
                    </span>
                  </li>
                  <li className="flex flex-col gap-1 py-3.5">
                    <span className="font-semibold">
                      3 seva places still free
                    </span>
                    <span className="text-peacock font-semibold">
                      Open the rota
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <figcaption className="text-muted pt-4 text-center text-base">
              Your committee&apos;s page says what needs doing next.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        aria-labelledby="start"
        className="own-toran bg-night text-on-night relative overflow-hidden rounded-[2rem]"
      >
        <Toran night />
        <div className="relative flex flex-col gap-10 px-6 pt-4 pb-12 sm:px-12 sm:pb-16">
          <h2
            id="start"
            className="font-display max-w-3xl text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl"
          >
            Three steps to start
          </h2>
          <ol className="grid gap-x-10 gap-y-8 md:grid-cols-3">
            <li className="border-on-night/20 flex flex-col gap-2 border-t pt-6">
              <span
                aria-hidden="true"
                className="font-display text-night-accent text-6xl leading-none"
              >
                1
              </span>
              <span className="text-xl font-semibold">
                <Link
                  href="/mandirs"
                  className="text-on-night underline decoration-1 underline-offset-4"
                >
                  Find your mandir
                </Link>
              </span>
              <span className="text-night-muted">
                Most UK mandirs already have a page.
              </span>
            </li>
            <li className="border-on-night/20 flex flex-col gap-2 border-t pt-6">
              <span
                aria-hidden="true"
                className="font-display text-night-accent text-6xl leading-none"
              >
                2
              </span>
              <span className="text-xl font-semibold">
                Choose &ldquo;Look after this page&rdquo;
              </span>
              <span className="text-night-muted">
                Log in with your email. We check you&apos;re on the committee.
              </span>
            </li>
            <li className="border-on-night/20 flex flex-col gap-2 border-t pt-6">
              <span
                aria-hidden="true"
                className="font-display text-night-accent text-6xl leading-none"
              >
                3
              </span>
              <span className="text-xl font-semibold">Add your events</span>
              <span className="text-night-muted">
                Or forward your patrika and we&apos;ll type it up.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="helps" className="flex flex-col gap-10">
        <h2
          id="helps"
          className="font-display max-w-3xl text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl"
        >
          Everything a busy committee needs
        </h2>
        <ul className="grid gap-x-12 md:grid-cols-2 lg:grid-cols-3">
          {HELPS.map((h) => (
            <li key={h.title} className="border-line flex gap-5 border-t py-7">
              {h.icon}
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xl font-semibold">{h.title}</h3>
                <p className="text-muted">{h.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-stretch gap-6">
        <section
          aria-labelledby="guide"
          className="bg-sunk flex min-w-0 flex-[1_1_26rem] flex-col gap-4 rounded-[2rem] p-6 sm:p-10"
        >
          <h2
            id="guide"
            className="font-display text-4xl leading-tight sm:text-5xl"
          >
            The committee guide
          </h2>
          <p className="text-muted text-lg">
            Every step, with a one-page handout to print.
          </p>
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            <Link href="/for-mandirs/guide" className={quietButtonClass}>
              Read the committee guide
            </Link>
            <Link href="/for-mandirs/guide/print" className={quietButtonClass}>
              Print the handout
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="keep"
          className="border-line flex min-w-0 flex-[1_1_26rem] flex-col gap-4 rounded-[2rem] border p-6 sm:p-10"
        >
          <h2
            id="keep"
            className="font-display text-4xl leading-tight sm:text-5xl"
          >
            What we keep, and what we don&apos;t
          </h2>
          <ul className="flex flex-col gap-3">
            {[
              "Families don't need an account.",
              "Your committee's contact details are never public.",
              "You can correct or remove your events at any time.",
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden="true" className="text-leaf-ink font-bold">
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
