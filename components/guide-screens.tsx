import type { CSSProperties, ReactNode } from "react";

// Pictures for the committee guide (/for-mandirs/guide): parts of the
// committee's page (app/(mandir)/manage/[slug]/page.tsx) drawn as they
// look on a phone, with the same words, for an example mandir. Each plays
// out one thing on a loop: the .guide-* styles in app/globals.css. Each
// is drawn at the end of its story, so with less motion it's still right.
// Pictures, not controls: one description each for screen readers, and
// nothing inside to tap.

const MANDIR = "Shree Sample Mandir";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// A phone, showing part of a screen.
function Screen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="guide-screen mx-auto w-full max-w-[22rem]"
    >
      <div
        aria-hidden="true"
        className="border-line-strong bg-bg shadow-lift relative overflow-hidden rounded-[2.25rem] border-[6px]"
      >
        <div className="flex justify-center pt-2">
          <span className="bg-line-strong h-1.5 w-16 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 p-4 pt-3">{children}</div>
      </div>
    </div>
  );
}

// Where a finger presses, on a loop: put it inside something `relative`.
function Tap({ at = "0s", round = true }: { at?: string; round?: boolean }) {
  return (
    <span
      className={`guide-tap ring-marigold pointer-events-none absolute inset-0 ring-4 ${round ? "rounded-full" : "rounded-2xl"}`}
      style={{ "--at": at } as Vars}
    />
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-line bg-surface shadow-card flex flex-col rounded-3xl border ${className}`}
    >
      {children}
    </div>
  );
}

function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const CHEVRON = "m9 6 6 6-6 6";
const PLUS = "M12 5v14M5 12h14";

function Primary({ children }: { children: ReactNode }) {
  return (
    <span className="bg-peacock text-on-peacock relative flex items-center justify-center gap-2 rounded-full px-5 py-3 text-lg font-semibold">
      {children}
    </span>
  );
}

function Pill({
  children,
  primary = false,
  tap,
}: {
  children: ReactNode;
  primary?: boolean;
  tap?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center rounded-full px-4 py-1.5 text-base font-semibold ${
        primary
          ? "bg-peacock text-on-peacock"
          : "border-line-strong bg-surface text-ink border"
      }`}
    >
      {children}
      {tap && <Tap at={tap} />}
    </span>
  );
}

// A sheet's header, as it comes up from the bottom of a phone.
function SheetTop({ title }: { title: string }) {
  return (
    <div className="border-line flex items-center gap-2 border-b px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-lg font-bold">{title}</span>
      <Icon d="M6 6l12 12M18 6 6 18" className="text-muted size-5" />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="font-semibold">{label}</span>
      <span className="border-line-strong bg-surface truncate rounded-xl border px-3 py-2">
        {value}
      </span>
    </span>
  );
}

// The top of the committee's page: its three tabs, the button to add
// events, the to-do list and what's coming up.
export function HubScreen() {
  return (
    <Screen label="The committee's page on a phone: the mandir's name, three tabs (Events, Seva, Numbers), the Add events button, a To do list and the events coming up.">
      <div className="flex flex-col">
        <span className="font-display text-2xl leading-tight">{MANDIR}</span>
        <span className="text-muted">
          Harrow ·{" "}
          <span className="text-peacock font-semibold">
            See your public page ↗
          </span>
        </span>
      </div>
      <div className="bg-sunk grid grid-cols-3 gap-1 rounded-full p-1">
        {["Events", "Seva", "Numbers"].map((tab, i) => (
          <span
            key={tab}
            className={`flex justify-center rounded-full py-1.5 font-semibold ${
              i === 0 ? "bg-surface text-ink shadow-card" : "text-muted"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <Primary>
        <Icon d={PLUS} className="size-6" />
        Add events
        <Tap />
      </Primary>
      <Card className="px-2 pb-2">
        <span className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-lg font-bold">To do</span>
          <span className="text-muted">Set up 2 of 3</span>
        </span>
        <TodoRow
          dashed
          title="Invite a colleague"
          detail="So you're not the only one."
        />
        <TodoRow
          title="Check 2 posters sent in"
          detail="Publish what's right."
        />
      </Card>
      <Card className="px-2 pb-2">
        <span className="flex items-center justify-between px-3 pt-3 pb-1">
          <span className="text-lg font-bold">
            Coming up <span className="text-muted font-normal">· 3</span>
          </span>
          <Pill>+ Add</Pill>
        </span>
        <EventRow when="Sat 21 Nov, 7pm" title="Bhajan sandhya" />
        <EventRow when="Every week · next Sun 22 Nov, 10am" title="Bal Vikas" />
      </Card>
    </Screen>
  );
}

// The to-do list close up: how far along setting up is, and what needs
// doing now, one tap each.
export function TodoScreen() {
  return (
    <Screen label="The To do list: Set up 2 of 3, with Invite a colleague still to do, then Check 2 posters sent in for your mandir, and Is Bhajan sandhya still on?">
      <Card className="px-2 pb-2">
        <span className="flex items-center justify-between gap-3 px-3 pt-3 pb-1">
          <span className="text-lg font-bold">To do</span>
          <span className="text-muted flex items-center gap-2">
            Set up 2 of 3
            <span className="bg-sunk h-2 w-14 overflow-hidden rounded-full">
              <span
                className="guide-fill bg-peacock block h-full w-2/3 rounded-full"
                style={{ "--at": "0s" } as Vars}
              />
            </span>
          </span>
        </span>
        <TodoRow
          dashed
          title="Invite a colleague"
          detail="So you're not the only one."
        />
        <span className="relative block rounded-2xl">
          <TodoRow
            title="Check 2 posters sent in"
            detail="Publish what's right."
          />
          <Tap at="2.5s" round={false} />
        </span>
        <TodoRow
          title="Is “Bhajan sandhya” still on?"
          detail="Press “Still on”."
        />
      </Card>
      <span className="text-muted flex items-center gap-2 px-2">
        <span className="text-leaf font-bold">✓</span>
        Done: Check your mandir&apos;s details, Add your first event
      </span>
    </Screen>
  );
}

function TodoRow({
  title,
  detail,
  dashed = false,
}: {
  title: string;
  detail: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-3 px-3 py-2">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${
          dashed
            ? "border-line-strong text-muted border-2 border-dashed"
            : "bg-marigold/20 text-marigold-ink"
        }`}
      >
        <Icon d={dashed ? PLUS : "M5 12l4 4 10-10"} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-snug">
        <span className="font-semibold">{title}</span>
        <span className="text-muted line-clamp-2">{detail}</span>
      </span>
      <Icon d={CHEVRON} className="text-peacock size-5" />
    </span>
  );
}

function EventRow({
  when,
  title,
  more = false,
}: {
  when: string;
  title: string;
  more?: boolean;
}) {
  return (
    <span className="flex items-center gap-1 px-3 py-2">
      <span className="flex min-w-0 flex-1 flex-col leading-snug">
        <span className="text-marigold-ink font-semibold">{when}</span>
        <span className="font-semibold">{title}</span>
      </span>
      <span className="text-muted relative grid size-10 shrink-0 place-items-center rounded-full">
        <svg viewBox="0 0 24 24" className="size-6">
          <circle cx="5" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="19" cy="12" r="2" fill="currentColor" />
        </svg>
        {more && <Tap />}
      </span>
    </span>
  );
}

const WAYS = [
  {
    title: "Photo of a poster",
    body: "Toran reads it and fills in the events.",
    icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  {
    title: "Paste a WhatsApp message",
    body: "Copy it, paste it, and Toran fills it in.",
    icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  },
  {
    title: "Type it in",
    body: "The name, the date and the time.",
    icon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  },
  {
    title: "Tick festivals",
    body: "Festivals coming up, in a few taps.",
    icon: "M12 3v3M5 21h14M7 21c0-4 2-7 5-9 3 2 5 5 5 9",
    badge: "3",
  },
];

// The "Add events" sheet: the four ways, lit up in turn.
export function AddScreen() {
  return (
    <Screen label="The Add events sheet, with four ways to add events: Photo of a poster, Paste a WhatsApp message, Type it in, and Tick festivals.">
      <Card className="-mx-1 overflow-hidden">
        <SheetTop title="Add events" />
        <div className="flex flex-col gap-3 p-3">
          <span className="text-muted">
            Choose whichever is easiest for you.
          </span>
          <span className="guide-cycle flex flex-col gap-2">
            {WAYS.map((w, i) => (
              <span
                key={w.title}
                style={{ "--i": i } as Vars}
                className="border-line flex items-center gap-3 rounded-2xl border p-2.5"
              >
                <span className="bg-peacock/10 text-peacock grid size-10 shrink-0 place-items-center rounded-2xl">
                  <Icon d={w.icon} className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span className="flex items-center gap-2 font-bold">
                    {w.title}
                    {w.badge && (
                      <span className="bg-marigold/20 text-marigold-ink rounded-full px-2 font-semibold">
                        {w.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-muted">{w.body}</span>
                </span>
              </span>
            ))}
          </span>
        </div>
      </Card>
    </Screen>
  );
}

// Typing an event in: a start and an end, and the "It repeats" tick that
// opens how often.
export function RepeatsScreen() {
  return (
    <Screen label="Typing an event in: its date, a start and an end time, and the It repeats tick box. Ticking it shows How often?, set to Every week, listed for a year.">
      <Card className="-mx-1 overflow-hidden">
        <SheetTop title="Type it in" />
        <div className="flex flex-col gap-3 p-3">
          <Field label="What's happening?" value="Bal Vikas" />
          <Field label="Date" value="Sun 22 Nov 2026" />
          <span className="grid grid-cols-2 gap-3">
            <Field label="Starts" value="10:00" />
            <Field label="Ends (optional)" value="11:30" />
          </span>
          <span className="flex items-start gap-3">
            <span className="guide-tick bg-peacock border-peacock text-on-peacock mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12l4 4 10-10" />
              </svg>
            </span>
            <span className="leading-snug font-semibold">
              It repeats (a weekly aarti, a class, a festival&apos;s nights)
            </span>
          </span>
          <span className="guide-open block">
            <span className="block">
              <span className="border-line flex flex-col gap-2 border-l-2 pl-3">
                <Field label="How often?" value="Every week ▾" />
                <span className="text-muted leading-snug">
                  It&apos;s listed for a year from the first date.
                </span>
              </span>
            </span>
          </span>
        </div>
      </Card>
    </Screen>
  );
}

// An event's ⋯ menu.
export function MenuScreen() {
  const rows = ["Edit", "Still on", "Cancel", "Duplicate", "Seva rota"];
  return (
    <Screen label="An event in Coming up, and its menu: Edit, Still on, Cancel, Duplicate, Seva rota and Remove.">
      <Card className="px-2 pb-2">
        <span className="px-3 pt-3 pb-1 text-lg font-bold">Coming up</span>
        <EventRow when="Sat 21 Nov, 7pm" title="Bhajan sandhya" more />
      </Card>
      <span
        className="guide-rise -mx-4 -mb-4 block"
        style={{ "--at": "0s" } as Vars}
      >
        <span className="border-line bg-surface shadow-lift flex flex-col rounded-t-3xl border">
          <SheetTop title="Bhajan sandhya" />
          <span className="flex flex-col gap-1.5 p-3">
            <span className="text-marigold-ink font-semibold">
              Sat 21 Nov, 7pm
            </span>
            {rows.map((r) => (
              <span
                key={r}
                className={`relative rounded-2xl px-4 py-2 font-semibold ${
                  r === "Still on"
                    ? "bg-peacock/10 text-peacock"
                    : "bg-sunk text-ink"
                }`}
              >
                {r}
                {r === "Still on" && <Tap at="2.4s" round={false} />}
              </span>
            ))}
            <span className="bg-sunk text-kumkum rounded-2xl px-4 py-2 font-semibold">
              Remove
            </span>
          </span>
        </span>
      </span>
    </Screen>
  );
}

// A poster sent in, waiting for the committee.
export function PosterScreen() {
  return (
    <Screen label="Posters waiting for you: events read off a poster, with Publish, Fix something first and Discard. Pressing Publish puts it on the mandir's page.">
      <Card className="gap-3 p-4">
        <span className="text-lg font-bold">Posters waiting for you</span>
        <span className="border-line flex flex-col gap-2 rounded-2xl border p-3">
          <span className="text-muted">Read from a photo of your poster</span>
          <span className="flex flex-col leading-snug">
            <span className="text-marigold-ink font-semibold">
              Sun 8 Nov, 6:30pm
            </span>
            <span className="font-semibold">Diwali Lakshmi puja</span>
          </span>
          <span className="flex flex-wrap gap-2">
            <Pill primary tap="0s">
              Publish
            </Pill>
            <Pill>Fix something first</Pill>
            <Pill>Discard</Pill>
          </span>
        </span>
      </Card>
      <span
        className="guide-pop bg-leaf-tint text-leaf-ink rounded-2xl px-4 py-3 font-semibold"
        style={{ "--at": "0.6s" } as Vars}
      >
        ✓ Published. It&apos;s on your public page now.
      </span>
    </Screen>
  );
}

// Aarti times in the mandir's details, and the same aarti in What's on.
export function AartiScreen() {
  return (
    <Screen label="Aarti times in the mandir's details, at 7am and 7pm, and the same aarti shown in What's on every day. The YouTube link shows as Watch on YouTube.">
      <Card className="gap-2 p-4">
        <span className="text-lg font-bold">Aarti times</span>
        <span className="grid grid-cols-[1fr_auto] gap-2">
          <Field label="Name" value="Mangala aarti" />
          <Field label="Time" value="07:00" />
        </span>
        <span className="grid grid-cols-[1fr_auto] gap-2">
          <span className="border-line-strong bg-surface truncate rounded-xl border px-3 py-2">
            Sandhya aarti
          </span>
          <span className="border-line-strong bg-surface rounded-xl border px-3 py-2">
            19:00
          </span>
        </span>
      </Card>
      <span className="text-muted flex items-center justify-center gap-2 font-semibold">
        <Icon d="M12 5v14M6 13l6 6 6-6" />
        In What&apos;s on, every day
      </span>
      <span className="guide-pop block" style={{ "--at": "0.4s" } as Vars}>
        <Card className="p-4 leading-snug">
          <span className="text-marigold-ink font-semibold">
            Every day · 7am
          </span>
          <span className="font-semibold">Mangala aarti</span>
          <span className="text-muted">{MANDIR}, Harrow</span>
        </Card>
      </span>
      <span className="flex justify-center">
        <Pill primary>▶ Watch on YouTube</Pill>
      </span>
    </Screen>
  );
}

// A seva rota filling up, and the message for the volunteers' group.
export function SevaScreen() {
  const roles = [
    { name: "Kitchen", taken: 4, needed: 6 },
    { name: "Car park", taken: 2, needed: 4 },
    { name: "Children's corner", taken: 3, needed: 3 },
  ];
  return (
    <Screen label="A seva rota for Diwali: Kitchen 4 of 6, Car park 2 of 4, Children's corner 3 of 3, and a button to send the rota on WhatsApp.">
      <Card className="gap-3 p-4">
        <span className="flex flex-col leading-snug">
          <span className="text-marigold-ink font-semibold">
            Sun 8 Nov, 6:30pm
          </span>
          <span className="text-lg font-bold">Diwali Lakshmi puja</span>
        </span>
        {roles.map((r, i) => (
          <span key={r.name} className="flex flex-col gap-1">
            <span className="flex justify-between gap-2">
              <span className="font-semibold">{r.name}</span>
              <span className="text-muted">
                {r.taken} of {r.needed}
              </span>
            </span>
            <span className="bg-sunk h-2.5 overflow-hidden rounded-full">
              <span
                className={`guide-fill block h-full rounded-full ${r.taken === r.needed ? "bg-leaf" : "bg-peacock"}`}
                style={
                  {
                    width: `${(r.taken / r.needed) * 100}%`,
                    "--at": `${i * 0.3}s`,
                  } as Vars
                }
              />
            </span>
          </span>
        ))}
        <span className="flex flex-wrap gap-2 pt-1">
          <Pill primary>Send on WhatsApp</Pill>
          <Pill>Copy the message</Pill>
        </span>
      </Card>
    </Screen>
  );
}

// This week's events, as one message for WhatsApp.
export function ShareScreen() {
  return (
    <Screen label="This week's events as one WhatsApp message: This week at Shree Sample Mandir, with each event's date and time, and a link to everything coming up.">
      <Card className="gap-3 p-4">
        <span className="text-lg font-bold">Share</span>
        <span className="flex flex-col">
          <span className="font-semibold">This week&apos;s events</span>
          <span className="text-muted">3 in the next seven days</span>
        </span>
        <span className="relative self-start">
          <Pill primary tap="0s">
            Send on WhatsApp
          </Pill>
        </span>
      </Card>
      <span className="bg-leaf-tint text-ink ml-6 rounded-2xl rounded-tr-sm p-3 leading-snug">
        <span className="guide-type block" style={{ "--at": "0.8s" } as Vars}>
          This week at {MANDIR}:
          <br />
          <br />• Sat 21 Nov, 7pm: Bhajan sandhya
          <br />• Sun 22 Nov, 10am: Bal Vikas
          <br />• Wed 25 Nov, 7pm: Gita path
          <br />
          <br />
          Everything coming up:{" "}
          <span className="text-peacock">toran…/mandirs/…</span>
        </span>
      </span>
    </Screen>
  );
}

// The Numbers tab.
export function NumbersScreen() {
  const weeks = [38, 52, 47, 71, 64, 96];
  return (
    <Screen label="The Numbers tab: views of the mandir's page and events each week, going up, and how many shared events or added them to a calendar.">
      <div className="bg-sunk grid grid-cols-3 gap-1 rounded-full p-1">
        {["Events", "Seva", "Numbers"].map((tab, i) => (
          <span
            key={tab}
            className={`flex justify-center rounded-full py-1.5 font-semibold ${
              i === 2 ? "bg-surface text-ink shadow-card" : "text-muted"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <Card className="gap-3 p-4">
        <span className="flex flex-col leading-snug">
          <span className="text-muted">Views of your page and events</span>
          <span className="font-display text-4xl">368</span>
        </span>
        <span className="flex h-24 items-end gap-2">
          {weeks.map((w, i) => (
            <span key={i} className="flex h-full flex-1 items-end">
              <span
                className="guide-grow bg-peacock/80 block w-full rounded-t-lg"
                style={{ height: `${w}%`, "--at": `${i * 0.15}s` } as Vars}
              />
            </span>
          ))}
        </span>
      </Card>
      <span className="grid grid-cols-2 gap-3">
        <Card className="p-3 leading-snug">
          <span className="text-muted">Shared</span>
          <span className="font-display text-3xl">41</span>
        </Card>
        <Card className="p-3 leading-snug">
          <span className="text-muted">Added to a calendar</span>
          <span className="font-display text-3xl">27</span>
        </Card>
      </span>
    </Screen>
  );
}
