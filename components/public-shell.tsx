import Link from "next/link";
import type { ReactNode } from "react";
import { Notice, Ornament } from "@/components/ui";
import { InstallApp } from "@/components/install-app";
import { SiteNav } from "@/components/site-nav";
import { ToranGarland } from "@/components/toran-garland";
import { translator } from "@/lib/i18n";

// Header, footer and page width for the public directory pages.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

// Stays at the top as you scroll, with a toran fringe along its edge.
export function SiteHeader() {
  const t = translator();
  return (
    <header className="bg-bg/85 sticky top-0 z-30 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label={t("shell.home")}
          className="shrink-0 transition-transform duration-300 hover:-rotate-2"
        >
          <ToranGarland className="h-5 w-16 sm:h-8 sm:w-32" />
        </Link>
        <SiteNav
          links={[
            { href: "/whats-on", label: t("shell.whatsOn") },
            { href: "/mandirs", label: t("shell.mandirs") },
            { href: "/festivals", label: t("shell.festivals") },
          ]}
        />
      </div>
      <div className="border-line border-b">
        <div aria-hidden="true" className="toran-fringe" />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = translator();
  return (
    <footer className="border-line bg-surface/60 text-muted mt-8 border-t">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 text-base sm:px-6">
        <ToranGarland className="h-6 w-28" decorative />
        <p className="max-w-prose">{t("shell.footer")}</p>
        <InstallApp />
        <p>
          <Link
            href="/for-mandirs"
            className="text-peacock font-semibold underline"
          >
            {t("shell.forMandirs")}
          </Link>
        </p>
      </div>
    </footer>
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
    <div className="rise flex flex-col gap-3">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <Ornament />
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
