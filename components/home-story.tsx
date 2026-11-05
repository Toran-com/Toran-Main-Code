import Link from "next/link";
import type { ReactNode } from "react";
import { LineIcon } from "@/components/line-icons";
import { StoryScroll } from "@/components/story-scroll";
import { dateTileParts, formatClock } from "@/lib/format";
import { localePath, pageT } from "@/lib/i18n/page";
import type { MessageKey } from "@/lib/i18n/en";

// "See how Toran works", on the home page: a phone stays on screen while
// the steps scroll past, and its screen changes to show each one, with
// the button you'd tap outlined in gold (components/story-scroll.tsx
// marks the step in view; app/globals.css, .story, does the rest). The
// phone is a picture made of HTML, hidden from screen readers: each step
// says in words what the button does, with a link to try it for real.

type Step = {
  title: MessageKey;
  body: MessageKey;
  try: MessageKey;
  href: string;
};

const STEPS: Step[] = [
  {
    title: "story.findTitle",
    body: "story.findBody",
    try: "story.findTry",
    href: "/whats-on",
  },
  {
    title: "story.calendarTitle",
    body: "story.calendarBody",
    try: "story.shareTry",
    href: "/whats-on",
  },
  {
    title: "story.shareTitle",
    body: "story.shareBody",
    try: "story.shareTry",
    href: "/whats-on",
  },
  {
    title: "story.followTitle",
    body: "story.followBody",
    try: "story.followTry",
    href: "/mandirs",
  },
  {
    title: "story.planTitle",
    body: "story.planBody",
    try: "story.planTry",
    href: "/festivals",
  },
  {
    title: "story.sevaTitle",
    body: "story.sevaBody",
    try: "story.sevaTry",
    href: "/seva",
  },
];

export function HomeStory() {
  const t = pageT();
  return (
    <section aria-labelledby="story" className="flex flex-col gap-10">
      <div className="reveal flex max-w-3xl flex-col gap-4">
        <p className="text-peacock text-base font-bold tracking-[0.12em] uppercase">
          {t("story.eyebrow")}
        </p>
        <h2
          id="story"
          className="font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl"
        >
          {t("story.title")}
        </h2>
        <p className="text-muted text-xl leading-relaxed">{t("story.intro")}</p>
      </div>

      <StoryScroll className="story grid gap-x-24 lg:grid-cols-[minmax(0,34rem)_auto] lg:justify-center">
        <div
          aria-hidden="true"
          className="story-stage sticky top-3 z-10 flex flex-col items-center gap-4 self-start pb-4 lg:top-28 lg:order-2"
        >
          <Phone />
          <ol className="flex gap-2">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                data-dot={i}
                className="story-dot bg-line-strong h-2 w-2 rounded-full"
              />
            ))}
          </ol>
        </div>

        <ol className="flex flex-col lg:order-1">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              data-story-step={i}
              className="story-step flex min-h-[80svh] flex-col justify-end pb-[14svh] lg:min-h-[85svh] lg:justify-center lg:pb-0"
            >
              <div className="bg-bg/95 shadow-card flex max-w-xl flex-col gap-3 rounded-3xl p-5 backdrop-blur sm:gap-4 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                <p className="text-muted flex items-center gap-3 text-base font-semibold">
                  <span
                    aria-hidden="true"
                    className="story-number font-display grid size-11 shrink-0 place-items-center rounded-full text-2xl"
                  >
                    {i + 1}
                  </span>
                  {t("story.step", { n: i + 1, total: STEPS.length })}
                </p>
                <h3 className="font-display text-3xl leading-tight sm:text-5xl">
                  {t(step.title)}
                </h3>
                <p className="text-muted text-lg leading-relaxed sm:text-xl">
                  {t(step.body)}
                </p>
                <Link
                  href={localePath(step.href)}
                  className="text-peacock w-fit text-lg font-semibold underline decoration-2 underline-offset-4"
                >
                  {t(step.try)} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </StoryScroll>
    </section>
  );
}

// The phone and its six screens, one for each step. Sizes are in cqw (a
// hundredth of the phone's width), so it scales as one picture.
function Phone() {
  const t = pageT();
  const day = dateTileParts("2026-11-08");
  const seva = dateTileParts("2026-11-07");
  const when = `${day.weekday} ${day.day} ${day.month.charAt(0)}${day.month.slice(1).toLowerCase()} · ${formatClock("18:30")}`;
  const events = [
    { title: "Diwali Lakshmi puja", miles: "0.8" },
    { title: "Annakut darshan", miles: "1.4" },
    { title: "Sharad Purnima garba", miles: "2.1" },
  ];

  return (
    <div className="story-phone [container-type:inline-size] w-[min(44vw,12.5rem)] lg:w-[min(21rem,calc((100svh-12rem)*0.47))]">
      <div className="rounded-[13cqw] bg-[#0b1426] p-[2.6cqw] shadow-[0_30px_80px_rgba(20,33,61,0.35)]">
        <div className="bg-bg text-ink relative aspect-[9/18.5] overflow-hidden rounded-[10.6cqw] text-[4.3cqw] leading-snug">
          {/* 1. What's on, near you */}
          <Screen n={0}>
            <Bar />
            <div className="flex flex-col gap-[3.5cqw] p-[5cqw]">
              <p className="font-display text-[8.5cqw] leading-none">
                {t("whatsOn.title")}
              </p>
              <div className="bg-surface border-line shadow-card flex items-center justify-between gap-[2cqw] rounded-full border py-[1.6cqw] pr-[1.6cqw] pl-[3.5cqw]">
                <span className="flex items-center gap-[1.5cqw] font-semibold">
                  <LineIcon name="pin" className="size-[4.5cqw]" />
                  {t("story.mockNear")}
                </span>
                <Target className="border-line rounded-full border px-[3cqw] py-[1.4cqw] font-semibold">
                  {t("story.mockFind")}
                </Target>
              </div>
              <div className="divide-line flex flex-col divide-y">
                {events.map((e) => (
                  <Row key={e.title} day={day} title={e.title}>
                    Shree Sample Mandir ·{" "}
                    {t("story.mockMiles", { miles: e.miles })}
                  </Row>
                ))}
              </div>
            </div>
          </Screen>

          {/* 2 and 3. An event: add to calendar, send on WhatsApp */}
          {[1, 2].map((n) => (
            <Screen key={n} n={n}>
              <Bar />
              <div className="bg-night text-on-night m-[3cqw] flex flex-col gap-[3cqw] rounded-[6cqw] p-[5cqw]">
                <Tile day={day} night />
                <p className="font-display text-[8cqw] leading-[1.05]">
                  Diwali Lakshmi puja
                </p>
                <p className="text-night-muted text-[3.8cqw]">
                  Shree Sample Mandir, Anytown
                </p>
              </div>
              <div className="flex flex-col gap-[3cqw] px-[5cqw] pt-[1cqw]">
                <p className="font-semibold">{when}</p>
                <p className="text-muted flex items-center gap-[1.5cqw] text-[3.8cqw]">
                  <LineIcon name="pin" className="size-[4cqw]" />1 Example Road,
                  Anytown
                </p>
                <MockButton target={n === 1} primary>
                  <CalendarIcon />
                  {t("story.mockCalendar")}
                </MockButton>
                <MockButton target={n === 2}>WhatsApp</MockButton>
              </div>
              {n === 2 && (
                <div className="story-bubble shadow-card absolute inset-x-[5cqw] bottom-[21cqw] flex flex-col gap-[1cqw] rounded-[4cqw] rounded-br-[1cqw] bg-[#d9fdd3] p-[3.5cqw] text-[3.6cqw] text-[#111b21]">
                  <span className="font-semibold">Diwali Lakshmi puja</span>
                  <span>{when}</span>
                  <span className="text-[#027eb5] underline">
                    toran.uk/mandirs/shree-sample…
                  </span>
                  <span className="self-end text-[3.2cqw] text-[#667781]">
                    {t("story.mockSent")} ✓✓
                  </span>
                </div>
              )}
            </Screen>
          ))}

          {/* 4. A mandir: follow it */}
          <Screen n={3}>
            <Bar />
            <div className="bg-night text-on-night m-[3cqw] flex flex-col gap-[3cqw] rounded-[6cqw] p-[5cqw]">
              <p className="font-display text-[8.5cqw] leading-[1.05]">
                Shree Sample Mandir
              </p>
              <p className="text-night-muted text-[3.8cqw]">Anytown</p>
              <Target className="bg-night-accent text-night flex w-fit items-center gap-[1.5cqw] rounded-full px-[4cqw] py-[1.8cqw] font-bold">
                <span aria-hidden="true">☆</span>
                {t("story.mockFollow")}
              </Target>
            </div>
            <div className="flex flex-col gap-[2.5cqw] px-[5cqw] pt-[2cqw]">
              <p className="text-muted flex items-center gap-[1.5cqw] font-semibold">
                <span className="text-marigold">★</span>
                {t("story.mockYours")}
              </p>
              <div className="divide-line flex flex-col divide-y">
                {events.slice(0, 2).map((e) => (
                  <Row key={e.title} day={day} title={e.title}>
                    Shree Sample Mandir
                  </Row>
                ))}
              </div>
            </div>
          </Screen>

          {/* 5. A plan for the festival */}
          <Screen n={4}>
            <Bar />
            <div className="flex flex-col gap-[3cqw] p-[5cqw]">
              <p className="font-display text-[8cqw] leading-none">Diwali</p>
              <div className="divide-line flex flex-col divide-y">
                {events.map((e, i) => (
                  <Row key={e.title} day={day} title={e.title}>
                    {i === 1 ? (
                      <Target className="border-peacock text-peacock mt-[1cqw] inline-flex rounded-full border px-[2.5cqw] py-[0.8cqw] font-semibold">
                        + {t("story.mockPlanAdd")}
                      </Target>
                    ) : (
                      <span className="text-peacock font-semibold">
                        ✓ {t("story.mockInPlan")}
                      </span>
                    )}
                  </Row>
                ))}
              </div>
            </div>
            <div className="bg-night text-on-night absolute inset-x-[4cqw] bottom-[21cqw] flex items-center justify-between rounded-full px-[4.5cqw] py-[3cqw] font-semibold">
              <span>{t("story.mockPlan", { count: 3 })}</span>
              <span className="text-night-accent">WhatsApp →</span>
            </div>
          </Screen>

          {/* 6. Seva: take a slot */}
          <Screen n={5}>
            <Bar />
            <div className="flex flex-col gap-[3cqw] p-[5cqw]">
              <p className="font-display text-[8cqw] leading-none">Seva</p>
              <div className="bg-surface border-line shadow-card flex flex-col gap-[2.5cqw] rounded-[5cqw] border p-[4.5cqw]">
                <p className="flex items-center gap-[2cqw] font-bold">
                  <LineIcon name="kitchen" className="size-[5cqw]" />
                  {t("story.mockKitchen")}
                </p>
                <p className="text-muted">
                  {seva.weekday} {seva.day} {seva.month.charAt(0)}
                  {seva.month.slice(1).toLowerCase()} · {formatClock("17:00")}–
                  {formatClock("20:00")}
                </p>
                <div className="bg-sunk h-[2cqw] overflow-hidden rounded-full">
                  <div className="story-fill bg-marigold h-full w-1/2 rounded-full" />
                </div>
                <p className="text-muted text-[3.8cqw]">
                  {t("story.mockTaken", { taken: 2, places: 4 })}
                </p>
                <MockButton target primary>
                  {t("story.mockTake")}
                </MockButton>
              </div>
            </div>
          </Screen>
        </div>
      </div>
    </div>
  );
}

// Which tab along the bottom each screen is on (none for Seva, which is
// in the menu).
const SCREEN_TAB = [0, 0, 0, 1, 2, -1];

function Screen({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div data-screen={n} className="story-screen absolute inset-0">
      {children}
      <Tabs active={SCREEN_TAB[n]} />
    </div>
  );
}

// The bar along the bottom, as on a phone.
function Tabs({ active }: { active: number }) {
  const t = pageT();
  const tabs = [
    t("shell.whatsOn"),
    t("shell.mandirs"),
    t("shell.festivals"),
    t("shell.my"),
  ];
  return (
    <div className="bg-surface border-line absolute inset-x-0 bottom-0 grid grid-cols-4 border-t pt-[2.5cqw] pb-[5cqw] text-center text-[2.9cqw] leading-tight">
      {tabs.map((label, i) => (
        <span
          key={label}
          className={`flex flex-col items-center gap-[1cqw] ${i === active ? "text-peacock font-semibold" : "text-muted"}`}
        >
          <span
            className={`h-[5cqw] w-[11cqw] rounded-full ${i === active ? "bg-peacock/15" : "bg-line"}`}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

// The header along the top of the phone.
function Bar() {
  return (
    <div className="bg-night text-on-night flex items-center justify-between px-[5cqw] pt-[7cqw] pb-[3cqw]">
      <span className="font-display text-night-accent text-[5cqw] tracking-[0.18em]">
        TORAN
      </span>
      <span className="text-[3.6cqw]">☰</span>
    </div>
  );
}

function Tile({
  day,
  night = false,
}: {
  day: { month: string; day: string; weekday: string };
  night?: boolean;
}) {
  return (
    <span
      className={`flex w-[14cqw] shrink-0 flex-col items-center rounded-[3.5cqw] py-[1.2cqw] leading-tight ${
        night ? "bg-on-night text-[#1b1a2c]" : "bg-tile border-tile-line border"
      }`}
    >
      <span
        className={`text-[2.8cqw] font-bold ${night ? "text-[#c21e3a]" : "text-date"}`}
      >
        {day.month}
      </span>
      <span className="font-display text-[6cqw] leading-none">{day.day}</span>
      <span className="text-muted text-[2.8cqw]">{day.weekday}</span>
    </span>
  );
}

function Row({
  day,
  title,
  children,
}: {
  day: { month: string; day: string; weekday: string };
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-[3cqw] py-[3cqw]">
      <Tile day={day} />
      <div className="flex min-w-0 flex-col gap-[0.5cqw]">
        <span className="font-semibold">{title}</span>
        <span className="text-muted text-[3.6cqw]">{children}</span>
      </div>
    </div>
  );
}

function MockButton({
  target = false,
  primary = false,
  children,
}: {
  target?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  const look = `flex items-center justify-center gap-[2cqw] rounded-full py-[2.6cqw] font-semibold ${
    primary
      ? "bg-peacock text-on-peacock"
      : "border-peacock text-peacock border-[0.5cqw]"
  }`;
  return target ? (
    <Target className={look}>{children}</Target>
  ) : (
    <span className={look}>{children}</span>
  );
}

// The button the step is about: outlined in gold, with a tap.
function Target({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <span className={`story-target relative ${className}`}>{children}</span>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[4.5cqw]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
