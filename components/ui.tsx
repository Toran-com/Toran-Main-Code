import type { ReactNode } from "react";

// The white (or, in dark mode, deep blue) panel for things you tap and
// for forms. Lists sit on the page with fine lines instead.
// A day in a list of events or seva ("Today", "Friday 6 November"), in
// the headline serif: calm, and easy to find when scrolling.
// It stays under the header while its day's events scroll past.
export const dayHeadingClass =
  "sticks font-display text-ink bg-bg/90 -mx-4 px-4 py-2 text-3xl leading-tight backdrop-blur-md sm:-mx-3 sm:rounded-2xl sm:px-3";

export const cardClass =
  "reveal border-line bg-surface shadow-card rounded-3xl border";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col gap-4 p-5 sm:gap-5 sm:p-7`}>
      {children}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const colours = {
    info: "border-transparent bg-sunk",
    error: "border-kumkum/40 bg-kumkum/5 text-kumkum",
    success: "border-peacock/30 bg-peacock/5 text-peacock",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rise rounded-2xl border px-5 py-4 ${colours}`}
    >
      {children}
    </p>
  );
}

export const inputClass =
  "border-line-strong bg-surface focus:outline-peacock hover:border-peacock/50 w-full rounded-2xl border px-4 py-3 text-lg transition-colors focus:outline-2";

// Everything you press is a soft pill. Buttons lift a little under the
// pointer and press in when tapped.
const press =
  "inline-flex items-center justify-center gap-2 text-center no-underline transition duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.97] disabled:pointer-events-none";

// The main action: one per screen.
export const buttonClass = `${press} bg-peacock text-on-peacock hover:bg-peacock-deep hover:shadow-lift w-full rounded-full px-6 py-3 text-lg font-semibold disabled:opacity-60`;

// Small pill buttons for actions on an item in a list (Edit, Cancel…),
// so a row of them fits on a phone.
export const pillButtonClass =
  "border-line-strong bg-surface text-ink hover:border-peacock/60 hover:text-peacock inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 text-base font-semibold no-underline transition duration-200 active:scale-95";

export const pillPrimaryClass =
  "bg-peacock text-on-peacock hover:bg-peacock-deep inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.5 text-base font-semibold no-underline transition duration-200 active:scale-95";

// Things to do with a page or event (directions, share, add to
// calendar): outlined pills with a peacock icon.
export const actionPillClass =
  "border-line-strong bg-surface text-ink hover:border-peacock/60 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold no-underline transition duration-200 active:scale-95 [&_svg]:text-peacock";

// Everything else you press: an outlined pill.
export const quietButtonClass = `${press} border-peacock bg-surface text-peacock hover:bg-peacock/8 rounded-full border-2 px-6 py-[0.625rem] text-lg font-semibold`;

export function Loading() {
  return (
    <p className="text-muted flex items-center gap-3" role="status">
      <span
        aria-hidden="true"
        className="border-marigold size-5 animate-spin rounded-full border-2 border-t-transparent"
      />
      Loading…
    </p>
  );
}
