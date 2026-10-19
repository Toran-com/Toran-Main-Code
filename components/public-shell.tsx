import Link from "next/link";
import type { ReactNode } from "react";
import { Notice, Ornament } from "@/components/ui";
import { InstallApp } from "@/components/install-app";
import { LanguageSwitch } from "@/components/language-switch";
import { SiteNav } from "@/components/site-nav";
import { ToranGarland } from "@/components/toran-garland";
import { LOCALES } from "@/lib/i18n";
import { localePath, pageT } from "@/lib/i18n/page";

// Header, footer and page width for the public directory pages.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 pb-10 sm:gap-8 sm:px-6 sm:pt-10">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

// Stays at the top as you scroll, with a toran fringe along its edge.
export function SiteHeader() {
  const t = pageT();
  return (
    <header className="bg-bg/85 sticky top-0 z-30 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={localePath("/")}
          aria-label={t("shell.home")}
          className="shrink-0 transition-transform duration-300 hover:-rotate-2"
        >
          <ToranGarland className="h-5 w-16 sm:h-8 sm:w-32" />
        </Link>
        <SiteNav
          links={[
            { href: localePath("/whats-on"), label: t("shell.whatsOn") },
            { href: localePath("/mandirs"), label: t("shell.mandirs") },
            { href: localePath("/festivals"), label: t("shell.festivals") },
          ]}
        />
        {LOCALES.gu.ready && <LanguageSwitch />}
      </div>
      <div className="border-line border-b">
        <div aria-hidden="true" className="toran-fringe" />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = pageT();
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
    <div className="rise flex flex-col gap-2 sm:gap-3">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <Ornament />
      {intro && (
        <p className="text-muted max-w-prose text-base sm:text-lg">{intro}</p>
      )}
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
  const t = pageT();
  return state === "not connected" ? (
    <Notice>{t("load.notConnected", { what })}</Notice>
  ) : (
    <Notice tone="error">{t("load.failed", { what })}</Notice>
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
