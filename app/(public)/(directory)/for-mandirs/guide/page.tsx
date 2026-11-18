import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, quietButtonClass } from "@/components/ui";
import {
  AartiScreen,
  AddScreen,
  HubScreen,
  MenuScreen,
  NumbersScreen,
  PosterScreen,
  RepeatsScreen,
  SevaScreen,
  ShareScreen,
  TodoScreen,
} from "@/components/guide-screens";
import { GUIDE_PATH } from "@/lib/committee-guide";
import { pageMetadata } from "@/lib/site";

// How a committee runs its mandir's page on Toran (its hub,
// app/(mandir)/manage/[slug]), and what it does for the mandir: one part
// at a time, each beside a picture of that part of the page playing out
// (components/guide-screens.tsx). The words on the buttons are the
// page's own. Linked from /for-mandirs, with a one-page handout to print
// for committee meetings.

export const metadata: Metadata = pageMetadata(
  "Committee guide",
  "How your mandir's committee runs its page on Toran, on a phone: adding events from a poster or a WhatsApp message, daily aarti, seva rotas, sharing and your numbers. Free for mandirs.",
  GUIDE_PATH,
);

const SECTIONS = [
  { id: "start", title: "Getting started" },
  { id: "hub", title: "Your hub at a glance" },
  { id: "add", title: "Adding events" },
  { id: "repeats", title: "Repeats and end times" },
  { id: "keep-right", title: "Keeping it right" },
  { id: "posters", title: "Posters waiting for you" },
  { id: "details", title: "Your details and daily aarti" },
  { id: "seva", title: "Seva rotas" },
  { id: "colleagues", title: "Inviting a colleague" },
  { id: "share", title: "Sharing your events" },
  { id: "numbers", title: "Your numbers" },
  { id: "privacy", title: "What we keep" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const icon = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-7 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const BENEFITS: { title: string; body: string; path: string }[] = [
  {
    title: "Families find you",
    body: "People look up mandirs near them and see your events, aarti times and how to get there.",
    path: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z",
  },
  {
    title: "Hardly any typing",
    body: "Send a photo of your poster, or paste the WhatsApp message you already sent. Toran fills in the events.",
    path: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    title: "Always up to date",
    body: "One tap says an event is still on, and families see “Confirmed by the mandir”. Cancel, and nobody makes a wasted journey.",
    path: "M5 12l4 4 10-10",
  },
  {
    title: "Seva, sorted",
    body: "Roles and shifts for each event, and the message for your volunteers' WhatsApp group, written for you.",
    path: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  },
  {
    title: "Share in one tap",
    body: "This week's events as one WhatsApp message, and a notice with a QR code for the noticeboard.",
    path: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  },
  {
    title: "See what's working",
    body: "How many people looked at your events, shared them and put them in their calendars.",
    path: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  },
];

// A button or heading on the committee's page, as the committee sees it.
function Ui({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">&ldquo;{children}&rdquo;</strong>;
}

// Numbered steps, one thing each.
function Steps({ children }: { children: ReactNode }) {
  return <ol className="guide-steps flex flex-col gap-3">{children}</ol>;
}
function Step({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 leading-relaxed">
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="bg-marigold/15 border-marigold rounded-2xl border-l-4 px-4 py-3 leading-relaxed">
      <span className="font-semibold">Tip: </span>
      {children}
    </p>
  );
}

// One part of the guide: its number and title, what to do, and a picture
// of that part of the page beside it (on alternate sides, on a laptop;
// underneath, on a phone).
function Section({
  id,
  picture,
  children,
}: {
  id: SectionId;
  picture?: ReactNode;
  children: ReactNode;
}) {
  const index = SECTIONS.findIndex((s) => s.id === id);
  const { title } = SECTIONS[index];
  const flip = index % 2 === 0;
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`border-line grid scroll-mt-28 items-center gap-8 border-t pt-10 sm:pt-14 ${
        picture ? "lg:grid-cols-2 lg:gap-16" : ""
      }`}
    >
      <div
        className={`flex min-w-0 flex-col gap-5 ${picture ? "" : "max-w-3xl"} ${flip && picture ? "lg:order-2" : ""}`}
      >
        <h2
          id={`${id}-title`}
          className="font-display flex items-center gap-4 text-3xl leading-tight sm:text-4xl"
        >
          <span
            aria-hidden="true"
            className="bg-marigold/20 text-marigold-ink grid size-12 shrink-0 place-items-center rounded-2xl font-sans text-xl font-bold"
          >
            {index + 1}
          </span>
          {title}
        </h2>
        {children}
      </div>
      {picture && <div className="reveal min-w-0">{picture}</div>}
    </section>
  );
}

export default function CommitteeGuidePage() {
  return (
    <div className="page-wide">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 sm:gap-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-6">
            <PageHeading
              title="Committee guide"
              intro="Your mandir's hub on Toran: one page, made for a phone, where your committee keeps families up to date. Most things take a minute. Here's how it works, a step at a time."
            />
            <ul className="rise-list flex flex-wrap gap-2">
              {[
                "Free for mandirs",
                "Works on any phone",
                "English and Gujarati",
              ].map((chip) => (
                <li
                  key={chip}
                  className="bg-peacock/10 text-peacock rounded-full px-4 py-1.5 font-semibold"
                >
                  {chip}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/join" className={`${buttonClass} sm:w-auto`}>
                Create an account
              </Link>
              <Link
                href="/demo"
                className={`${quietButtonClass} text-center sm:w-auto`}
              >
                Try the example mandir
              </Link>
            </div>
          </div>
          <div className="rise min-w-0">
            <HubScreen />
          </div>
        </div>

        <section
          aria-labelledby="benefits"
          className="bg-night text-on-night flex flex-col gap-6 rounded-[2rem] p-6 sm:p-10"
        >
          <h2
            id="benefits"
            className="font-display text-3xl leading-tight sm:text-4xl"
          >
            What it does for your mandir
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <li
                key={b.title}
                className="reveal flex flex-col gap-2 rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10"
              >
                <span className="text-night-accent">
                  <svg {...icon}>
                    <path d={b.path} />
                  </svg>
                </span>
                <span className="text-xl font-bold">{b.title}</span>
                <span className="text-night-muted leading-relaxed">
                  {b.body}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <nav
          aria-label="In this guide"
          className="bg-sunk flex flex-col gap-4 rounded-3xl p-6"
        >
          <h2 className="text-xl font-semibold">In this guide</h2>
          <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="flex gap-3">
                <span aria-hidden="true" className="text-muted w-6 text-right">
                  {i + 1}
                </span>
                <a href={`#${s.id}`} className="text-peacock underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
          <Link
            href={`${GUIDE_PATH}/print`}
            className="text-peacock w-fit font-semibold"
          >
            Print a one-page handout
          </Link>
        </nav>

        <Section id="start">
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Create an account",
                body: (
                  <>
                    <Link href="/join" className="text-peacock underline">
                      Create an account
                    </Link>{" "}
                    with your email. We send you a link, so there&apos;s no
                    password to remember.
                  </>
                ),
              },
              {
                title: "Choose your mandir",
                body: "Find it by name or town: most UK mandirs already have a page. Say what you do there, such as Secretary or Trustee.",
              },
              {
                title: "We check, then you're in",
                body: "We check with the mandir that you're on the committee, usually within a few days.",
              },
            ].map((s, i) => (
              <li
                key={s.title}
                className="reveal border-line bg-surface shadow-card flex flex-col gap-2 rounded-3xl border p-5"
              >
                <span
                  aria-hidden="true"
                  className="bg-peacock text-on-peacock grid size-10 place-items-center rounded-full text-lg font-bold"
                >
                  {i + 1}
                </span>
                <span className="text-xl font-bold">{s.title}</span>
                <span className="text-muted leading-relaxed">{s.body}</span>
              </li>
            ))}
          </ol>
          <p className="text-muted leading-relaxed">
            Already checked? Log in, go to <Ui>Your account</Ui> and choose your
            mandir&apos;s name. You can also press <Ui>Look after this page</Ui>{" "}
            at the bottom of your mandir&apos;s public page.
          </p>
        </Section>

        <Section id="hub" picture={<TodoScreen />}>
          <p className="leading-relaxed">
            Everything is on one page, and only your committee can see it. There
            are three tabs along the top:
          </p>
          <Steps>
            <Step>
              <Ui>Events</Ui>: the button to add events, your to-do list,
              posters to check and everything coming up.
            </Step>
            <Step>
              <Ui>Seva</Ui>: your rotas, and which events still need volunteers.
            </Step>
            <Step>
              <Ui>Numbers</Ui>: how many people looked at and shared your
              events.
            </Step>
          </Steps>
          <Tip>
            Start with <Ui>To do</Ui>. It lists what needs doing now, and the
            setup steps until they&apos;re done. Tap a row and it takes you to
            the right place.
          </Tip>
          <p className="text-muted leading-relaxed">
            Forms stay out of the way until you need them. Press a button and a
            panel comes up from the bottom of your phone. Press the cross, or
            tap outside it, to put it away.
          </p>
        </Section>

        <Section id="add" picture={<AddScreen />}>
          <p className="leading-relaxed">
            Press <Ui>Add events</Ui> at the top of your page, then choose
            whichever way is easiest:
          </p>
          <Steps>
            <Step>
              <Ui>Photo of a poster</Ui>: take a photo, or choose one. Toran
              reads the events off it for you to check. The photo isn&apos;t
              kept.
            </Step>
            <Step>
              <Ui>Paste a WhatsApp message</Ui>: in WhatsApp, press and hold the
              message, then Copy, and paste it in.
            </Step>
            <Step>
              <Ui>Type it in</Ui>: the name, the date and the start time. Leave
              the time empty for an all-day event.
            </Step>
            <Step>
              <Ui>Tick festivals</Ui>: the festivals coming up, on your
              mandir&apos;s calendar dates. Tick the ones you&apos;re
              celebrating and add them all at once.
            </Step>
          </Steps>
          <Tip>
            From your second year, <Ui>Again this year?</Ui> brings back last
            year&apos;s events on this year&apos;s dates. A Diwali event stays
            on Diwali, and a Saturday event stays on a Saturday.
          </Tip>
        </Section>

        <Section id="repeats" picture={<RepeatsScreen />}>
          <Steps>
            <Step>
              Give a start time, and when it ends if you know. Families see
              &ldquo;10am&nbsp;– 11:30am&rdquo;, so they can plan around it.
            </Step>
            <Step>
              For a weekly class, a monthly bhajan evening or a festival&apos;s
              nights in a row, tick <Ui>It repeats</Ui> and choose{" "}
              <Ui>How often?</Ui>: every day, every week, every other week or
              once a month.
            </Step>
            <Step>
              It&apos;s listed for a year from the first date. If it stops
              sooner, open <Ui>Stops sooner?</Ui> and give the <Ui>Last day</Ui>
              .
            </Step>
          </Steps>
          <p className="text-muted leading-relaxed">
            A repeating event shows once in your list, with its next date, and
            every date is on the event&apos;s own page.
          </p>
        </Section>

        <Section id="keep-right" picture={<MenuScreen />}>
          <p className="leading-relaxed">
            Press <Ui>⋯</Ui> next to any event under <Ui>Coming up</Ui>:
          </p>
          <Steps>
            <Step>
              <Ui>Still on</Ui> tells everyone you&apos;ve checked it. They see
              &ldquo;Confirmed by the mandir&rdquo;.
            </Step>
            <Step>
              <Ui>Cancel</Ui> keeps it on your page, marked as cancelled, so
              nobody makes a wasted journey. <Ui>It&apos;s back on</Ui> undoes
              it.
            </Step>
            <Step>
              <Ui>Edit</Ui> changes the details. <Ui>Duplicate</Ui> copies it,
              for a second day or a similar event.
            </Step>
            <Step>
              <Ui>Remove</Ui> takes it off your page altogether, for something
              added by mistake.
            </Step>
          </Steps>
          <p className="text-muted leading-relaxed">
            Changes show on your public page straight away. Your to-do list
            reminds you to check events coming up soon.
          </p>
        </Section>

        <Section id="posters" picture={<PosterScreen />}>
          <p className="leading-relaxed">
            Events read off a photo or a message wait for you under{" "}
            <Ui>Posters waiting for you</Ui>. So do events found on your
            mandir&apos;s website, or sent in by your volunteers. Nothing goes
            on your page until you say so.
          </p>
          <Steps>
            <Step>
              <Ui>Publish</Ui> if it&apos;s right. It&apos;s on your page
              straight away.
            </Step>
            <Step>
              <Ui>Fix something first</Ui> to change a date, a time or the name,
              then publish it.
            </Step>
            <Step>
              <Ui>Discard</Ui> if it isn&apos;t happening.
            </Step>
          </Steps>
          <Tip>
            Keep your events in Google Calendar or Outlook? Under{" "}
            <Ui>Your mandir</Ui>, choose <Ui>Your calendar</Ui> and paste its
            address. Toran reads it each night, and new events wait here for you
            to check.
          </Tip>
        </Section>

        <Section id="details" picture={<AartiScreen />}>
          <p className="leading-relaxed">
            Under <Ui>Your mandir</Ui>, choose <Ui>Details</Ui> for your
            postcode, website, opening times and how to visit.
          </p>
          <Steps>
            <Step>
              Add your <Ui>Aarti times</Ui>, and they&apos;re in What&apos;s on
              every day for families looking for an aarti near them. Change the
              times, and they change there too.
            </Step>
            <Step>
              Add your <Ui>YouTube / Livestream</Ui> link, and your page shows{" "}
              <Ui>Watch on YouTube</Ui> for anyone who can&apos;t come in
              person.
            </Step>
            <Step>
              Choose <Ui>Photo</Ui> to put a photo of your mandir&apos;s
              building at the top of your page.
            </Step>
          </Steps>
          <p className="text-muted leading-relaxed">
            To change your mandir&apos;s name or town, ask us and we&apos;ll
            update it.
          </p>
        </Section>

        <Section id="seva" picture={<SevaScreen />}>
          <Steps>
            <Step>
              Press <Ui>⋯</Ui> next to an event and choose <Ui>Seva rota</Ui>.
              Add the roles it needs (kitchen, car park, shoes) and the times
              for each.
            </Step>
            <Step>
              Under <Ui>Send the rota</Ui>, Toran writes the message for your
              volunteers&apos; WhatsApp group. When people say yes there, count
              them in.
            </Step>
            <Step>
              Or let volunteers take a place on Toran from the rota&apos;s link,
              in one tap. You see how many are coming, not who.
            </Step>
          </Steps>
          <p className="text-muted leading-relaxed">
            The <Ui>Seva</Ui> tab shows all your rotas, and your to-do list
            tells you when places are still free.
          </p>
        </Section>

        <Section id="colleagues">
          <Steps>
            <Step>
              Under <Ui>Your mandir</Ui>, choose <Ui>Committee</Ui>, enter a
              colleague&apos;s email address and press <Ui>Invite</Ui>.
            </Step>
            <Step>
              Send them the invite on WhatsApp. They log in with that email
              address to accept. The invite lasts 14 days.
            </Step>
            <Step>
              Everyone on your committee can add and change events and invite
              others, so you&apos;re never the only one.
            </Step>
          </Steps>
        </Section>

        <Section id="share" picture={<ShareScreen />}>
          <Steps>
            <Step>
              Under <Ui>Share</Ui>, <Ui>This week&apos;s events</Ui> puts the
              next seven days in one message. Press <Ui>Send on WhatsApp</Ui>{" "}
              and choose your groups.
            </Step>
            <Step>
              Every event has its own page. Shared on WhatsApp, it shows as a
              card with the date and your mandir&apos;s name.
            </Step>
            <Step>
              <Ui>Print for a noticeboard</Ui> on your public page makes a
              one-page notice of what&apos;s on, with a QR code that always
              shows the latest.
            </Step>
            <Step>
              Families can add an event to their phone&apos;s calendar, or get
              all your events there, with new ones appearing by themselves.
            </Step>
          </Steps>
        </Section>

        <Section id="numbers" picture={<NumbersScreen />}>
          <p className="leading-relaxed">
            The <Ui>Numbers</Ui> tab shows how your events are doing, over the
            last week, month, three months or year:
          </p>
          <Steps>
            <Step>Views of your page and events.</Step>
            <Step>How many times your events were shared.</Step>
            <Step>
              How many people added an event to their calendar, or follow your
              whole calendar.
            </Step>
          </Steps>
          <Tip>
            Handy for a trustees&apos; meeting, or to see which events people
            look out for.
          </Tip>
          <p className="text-muted leading-relaxed">
            They&apos;re counts only: Toran never knows who looked.
          </p>
        </Section>

        <Section id="privacy">
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              "No one needs an account to see your events.",
              "Only your events and your mandir's public details are shown. Your committee's email addresses and phone numbers are never public.",
              "Seva sign-ups on Toran are counted, never named. Toran never sees DBS certificates.",
              "Your committee can correct or remove your events at any time.",
            ].map((line) => (
              <li
                key={line}
                className="border-line bg-surface flex gap-3 rounded-2xl border p-4 leading-relaxed"
              >
                <span aria-hidden="true" className="text-leaf font-bold">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
          <p className="text-muted">
            The details are in our{" "}
            <Link href="/privacy" className="text-peacock underline">
              privacy notice
            </Link>
            .
          </p>
        </Section>

        <section
          aria-labelledby="ready"
          className="bg-peacock text-on-peacock flex flex-col items-start gap-5 rounded-[2rem] p-6 sm:p-10"
        >
          <h2
            id="ready"
            className="font-display text-3xl leading-tight sm:text-4xl"
          >
            Ready when you are
          </h2>
          <p className="max-w-prose text-lg leading-relaxed">
            Create an account, choose your mandir, and add your next event from
            a photo of its poster.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/join"
              className="bg-surface text-peacock rounded-full px-6 py-3 text-center text-lg font-semibold no-underline"
            >
              Create an account
            </Link>
            <Link
              href="/for-mandirs"
              className="border-on-peacock text-on-peacock rounded-full border-2 px-6 py-[0.625rem] text-center text-lg font-semibold no-underline"
            >
              More about Toran for mandirs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
