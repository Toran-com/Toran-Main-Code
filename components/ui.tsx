import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ornaments";

// The narrow card layout used by login, account and admin pages.
export function PageShell({
  title,
  wide = false,
  children,
}: {
  title: string;
  // Wider pages for admin lists and forms.
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      className={`rise mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-14 ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      <Link
        href="/"
        aria-label="Toran home"
        className="text-ink self-start no-underline"
      >
        <Logo size="sm" />
      </Link>
      <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
        {title}
      </h1>
      {children}
      <nav
        aria-label="About Toran"
        className="text-muted mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-6 text-base"
      >
        <Link href="/privacy" prefetch={false} className="underline">
          Privacy
        </Link>
        <Link href="/terms" prefetch={false} className="underline">
          Terms
        </Link>
        <Link href="/contact" prefetch={false} className="underline">
          Contact
        </Link>
      </nav>
    </main>
  );
}

// The white (or, in dark mode, deep blue) panel for things you tap and
// for forms. Lists sit on the page with fine lines instead.
export const cardClass =
  "border-line bg-surface shadow-card rounded-3xl border";

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

// Everything you press is a soft pill. Buttons press in a little when
// tapped.
const press =
  "inline-flex items-center justify-center gap-2 text-center no-underline transition duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none";

// The main action: one per screen.
export const buttonClass = `${press} bg-peacock text-on-peacock hover:bg-peacock-deep w-full rounded-full px-6 py-3 text-lg font-semibold disabled:opacity-60`;

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
export const quietButtonClass = `${press} border-line-strong bg-surface text-ink hover:border-peacock/60 rounded-full border px-6 py-3 text-lg font-semibold`;

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
