import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, cardClass, quietButtonClass } from "@/components/ui";
import { GUIDE_PATH } from "@/lib/committee-guide";
import { pageMetadata } from "@/lib/site";

// How a committee uses Toran, step by step: from asking to look after the
// page to sharing events and planning seva. Linked from /for-mandirs, with
// a one-page handout to print for committee meetings.

export const metadata: Metadata = pageMetadata(
  "Committee guide",
  "How your mandir's committee looks after its page on Toran: adding events, festivals, seva rotas and inviting colleagues. Free for mandirs.",
  GUIDE_PATH,
);

const SECTIONS = [
  { id: "start", title: "Getting started" },
  { id: "your-page", title: "Your committee page" },
  { id: "add", title: "Adding events" },
  { id: "keep-right", title: "Keeping it right" },
  { id: "posters", title: "Posters people send" },
  { id: "seva", title: "Seva rotas" },
  { id: "colleagues", title: "Inviting a colleague" },
  { id: "share", title: "Sharing with families" },
  { id: "privacy", title: "What we keep" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const number = SECTIONS.findIndex((s) => s.id === id) + 1;
  const { title } = SECTIONS[number - 1];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`${cardClass} flex scroll-mt-24 flex-col gap-4 p-5 sm:p-6`}
    >
      <h2
        id={`${id}-title`}
        className="flex items-center gap-3 text-xl font-bold sm:text-2xl"
      >
        <span
          aria-hidden
          className="bg-marigold/15 text-marigold-ink grid size-9 shrink-0 place-items-center rounded-full text-lg"
        >
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>;
}

// A button or heading on the committee page, as the committee sees it.
function Ui({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">&ldquo;{children}&rdquo;</strong>;
}

export default function CommitteeGuidePage() {
  return (
    <>
      <PageHeading
        title="Committee guide"
        intro="How your committee looks after your mandir's page on Toran. Most things take a minute, on a phone."
      />

      <nav aria-label="In this guide" className={`${cardClass} p-5 sm:p-6`}>
        <h2 className="mb-3 text-lg font-bold">In this guide</h2>
        <ol className="grid list-decimal gap-x-8 gap-y-2 pl-6 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-peacock underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`${GUIDE_PATH}/print`}
          className={`${quietButtonClass} text-center sm:w-auto`}
        >
          Print a one-page handout
        </Link>
        <Link
          href="/demo"
          className={`${quietButtonClass} text-center sm:w-auto`}
        >
          Try the example mandir
        </Link>
      </div>

      <Section id="start">
        <Steps>
          <li>
            <Link href="/mandirs" className="text-peacock underline">
              Find your mandir
            </Link>{" "}
            by name, town or postcode. Most UK mandirs already have a page with
            their address and website.
          </li>
          <li>
            At the bottom of your mandir&apos;s page, choose{" "}
            <Ui>Look after this page</Ui>. Log in with your email (we send you a
            link, so there&apos;s no password to remember).
          </li>
          <li>
            Say what you do at the mandir, for example Secretary or Trustee. We
            check with the mandir that you&apos;re on the committee, usually
            within a few days.
          </li>
        </Steps>
      </Section>

      <Section id="your-page">
        <p>
          Once you&apos;re checked, log in and go to <Ui>Your account</Ui>, then
          your mandir&apos;s name. This is your committee page. Only your
          committee can see it.
        </p>
        <Steps>
          <li>
            <Ui>Coming up</Ui> lists your events, with buttons to change each
            one.
          </li>
          <li>
            <Ui>Add an event</Ui>, <Ui>Festivals coming up</Ui> and{" "}
            <Ui>Again this year?</Ui> are the quick ways to fill your page.
          </li>
          <li>
            <Ui>Your committee on Toran</Ui> shows who else can change your
            page.
          </li>
          <li>
            <Ui>Your mandir&apos;s details</Ui> shows your address and website.
            To change them, tell us and we&apos;ll update them.
          </li>
        </Steps>
      </Section>

      <Section id="add">
        <Steps>
          <li>
            <Ui>Festivals coming up</Ui>: tick the festivals your mandir is
            celebrating, add a start time if you know it, and add them all at
            once. The dates follow your mandir&apos;s calendar.
          </li>
          <li>
            <Ui>Again this year?</Ui>: last year&apos;s events, moved to this
            year&apos;s dates. A Diwali event stays on Diwali; a Saturday event
            stays on a Saturday.
          </li>
          <li>
            <Ui>Add an event</Ui>: give its name, the date and the start time.
            Leave the time empty for an all-day event.
          </li>
          <li>
            For a weekly aarti or a monthly bhajan evening, open{" "}
            <Ui>Happens every week or month?</Ui> and choose how often. It shows
            once on your page, with its next date.
          </li>
          <li>
            Add a short description, and the name and description in Gujarati if
            you like. Families who read Gujarati see both.
          </li>
          <li>
            <Ui>Duplicate</Ui> copies an event you already have, for a second
            day or a similar event.
          </li>
        </Steps>
      </Section>

      <Section id="keep-right">
        <p>Next to each event on your committee page:</p>
        <Steps>
          <li>
            <Ui>Still on</Ui> tells families you&apos;ve checked it. They see
            &ldquo;Confirmed by the mandir&rdquo;.
          </li>
          <li>
            <Ui>Cancel</Ui> keeps it on the page, marked as cancelled, so nobody
            makes a wasted journey.
          </li>
          <li>
            <Ui>Edit</Ui> changes the name, date, time or description.
          </li>
          <li>
            <Ui>Remove</Ui> takes it off the page altogether, for something
            added by mistake.
          </li>
        </Steps>
        <p className="text-muted">
          Changes show on your public page straight away.
        </p>
      </Section>

      <Section id="posters">
        <p>
          Families and volunteers can tell Toran about an event, or send a
          poster or patrika. We type it up, and it waits for you under{" "}
          <Ui>Posters waiting for you</Ui>.
        </p>
        <Steps>
          <li>
            <Ui>Publish</Ui> if it&apos;s right. It goes on your page.
          </li>
          <li>
            <Ui>Not right</Ui> if it isn&apos;t. Nothing is published, and you
            can add the event yourself.
          </li>
        </Steps>
        <p className="text-muted">
          You can send us your own patrika too, the one you already share on
          WhatsApp, and we&apos;ll type it up for you to check.
        </p>
      </Section>

      <Section id="seva">
        <Steps>
          <li>
            Choose <Ui>Seva rota</Ui> next to an event. Add the roles it needs
            (kitchen, parking, shoes) and the times for each.
          </li>
          <li>
            <Ui>Send the rota</Ui> writes a message for your volunteers&apos;
            WhatsApp group. When people say yes there, count them in.
          </li>
          <li>
            Or let volunteers take a slot on Toran from the rota link, in one
            tap. You see how many are coming, not who: Toran never keeps
            anyone&apos;s name.
          </li>
        </Steps>
      </Section>

      <Section id="colleagues">
        <Steps>
          <li>
            Under <Ui>Your committee on Toran</Ui>, enter a colleague&apos;s
            email address and choose <Ui>Invite</Ui>.
          </li>
          <li>
            Send them the invite on WhatsApp. They log in with that email
            address to accept. The invite lasts 14 days.
          </li>
          <li>
            Anyone on your committee page can add and change events, invite
            others or leave.
          </li>
        </Steps>
      </Section>

      <Section id="share">
        <Steps>
          <li>
            Every event has its own page. Share it to your WhatsApp groups in
            one tap; it shows as a card with the date and your mandir&apos;s
            name.
          </li>
          <li>
            <Ui>Print for a noticeboard</Ui> on your mandir&apos;s page makes a
            one-page notice of what&apos;s on, with a QR code that always shows
            the latest. Put it on the noticeboard or hand it out.
          </li>
          <li>
            Families can add one event to their phone&apos;s calendar, or get
            all your mandir&apos;s events there, with new ones appearing by
            themselves.
          </li>
        </Steps>
      </Section>

      <Section id="privacy">
        <Steps>
          <li>Families don&apos;t need an account to see your events.</li>
          <li>
            Only events and your mandir&apos;s public details are shown. Your
            committee&apos;s email addresses and phone numbers are never public.
          </li>
          <li>
            Seva sign-ups on Toran are counted, never named. Toran never sees
            DBS certificates.
          </li>
          <li>Your committee can correct or remove your events at any time.</li>
        </Steps>
      </Section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/mandirs" className={`${buttonClass} sm:w-auto`}>
          Find your mandir
        </Link>
        <Link
          href="/for-mandirs"
          className={`${quietButtonClass} text-center sm:w-auto`}
        >
          More about Toran for mandirs
        </Link>
      </div>
    </>
  );
}
