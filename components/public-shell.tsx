import Link from "next/link";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui";
import { ToranGarland } from "@/components/toran-garland";
import { translator } from "@/lib/i18n";

// Header, footer and page width for the public directory pages.
export function PublicShell({ children }: { children: ReactNode }) {
  const t = translator();
  return (
    <>
      <header className="border-line border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label={t("shell.home")} className="shrink-0">
            <ToranGarland className="h-5 w-16 sm:h-8 sm:w-32" />
          </Link>
          <nav aria-label="Main">
            <ul className="flex gap-3 text-base font-semibold whitespace-nowrap sm:gap-5 sm:text-lg">
              <li>
                <Link href="/whats-on" className="hover:text-peacock">
                  {t("shell.whatsOn")}
                </Link>
              </li>
              <li>
                <Link href="/mandirs" className="hover:text-peacock">
                  {t("shell.mandirs")}
                </Link>
              </li>
              <li>
                <Link href="/festivals" className="hover:text-peacock">
                  {t("shell.festivals")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        {children}
      </main>
      <footer className="border-line text-muted border-t">
        <p className="mx-auto w-full max-w-3xl px-4 py-6 text-base sm:px-6">
          {t("shell.footer")}
        </p>
      </footer>
    </>
  );
}

export function PageHeading({
  title,
  intro,
}: {
  title: string;
  intro?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {intro && <p className="text-muted max-w-prose text-lg">{intro}</p>}
    </div>
  );
}

// What to show when the database isn't connected or doesn't answer.
export function LoadProblem({
  state,
  what,
}: {
  state: "not connected" | "unavailable";
  what: string;
}) {
  return state === "not connected" ? (
    <Notice>
      The {what} isn&apos;t connected yet. Please check back soon.
    </Notice>
  ) : (
    <Notice tone="error">
      We couldn&apos;t load the {what} just now. Please try again in a minute.
    </Notice>
  );
}

export function Badge({
  tone = "quiet",
  children,
}: {
  tone?: "quiet" | "marigold" | "peacock" | "kumkum";
  children: ReactNode;
}) {
  const colours = {
    quiet: "bg-sunk text-muted",
    marigold: "bg-marigold/15 text-marigold-ink",
    peacock: "bg-peacock/10 text-peacock",
    kumkum: "bg-kumkum/10 text-kumkum",
  }[tone];
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-base font-semibold ${colours}`}
    >
      {children}
    </span>
  );
}
