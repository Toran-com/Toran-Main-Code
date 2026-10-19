import Link from "next/link";
import type { ReactNode } from "react";
import { ToranGarland } from "@/components/toran-garland";

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
      <Link href="/" aria-label="Toran home" className="self-start">
        <ToranGarland className="h-8 w-36" />
      </Link>
      <div className="flex flex-col gap-2 sm:gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <Ornament />
      </div>
      {children}
    </main>
  );
}

// Two fading lines and a marigold diamond, under page headings.
export function Ornament() {
  return (
    <span className="ornament" aria-hidden="true">
      <span />
    </span>
  );
}

// The white (or, in dark mode, deep blue) panel used for cards and forms.
export const cardClass =
  "border-line bg-surface shadow-card rounded-2xl border";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className={`${cardClass} flex flex-col gap-5 p-6`}>{children}</div>
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
    info: "border-line border-l-marigold bg-sunk",
    error: "border-kumkum text-kumkum bg-surface",
    success: "border-peacock text-peacock bg-surface",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rise rounded-xl border border-l-4 px-4 py-3 ${colours}`}
    >
      {children}
    </p>
  );
}

export const inputClass =
  "border-line bg-surface focus:outline-peacock w-full rounded-xl border px-4 py-3 text-lg shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition-colors focus:outline-2 hover:border-peacock/40";

// Buttons rise a little under the pointer and press in when tapped.
const press =
  "inline-flex items-center justify-center gap-2 text-center transition duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none";

export const buttonClass = `${press} bg-linear-to-b from-peacock to-peacock-deep w-full rounded-xl px-5 py-3 text-lg font-semibold text-on-peacock shadow-card hover:shadow-lift hover:brightness-110 disabled:opacity-60`;

export const quietButtonClass = `${press} border-line bg-surface text-ink hover:border-marigold/60 shadow-card hover:shadow-lift rounded-xl border px-5 py-3 text-lg font-semibold`;

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
