import Link from "next/link";
import type { ReactNode } from "react";
import { Notice } from "@/components/ui";
import { InstallApp } from "@/components/install-app";
import { DisplaySettings } from "@/components/display-settings";
import { LanguageSwitch } from "@/components/language-switch";
import { MyToranLink } from "@/components/my-toran-link";
import { Logo, Toran } from "@/components/ornaments";
import { SiteNav } from "@/components/site-nav";
import { LOCALES } from "@/lib/i18n";
import { localePath, pageLocale, pageT } from "@/lib/i18n/page";
import { TRANSLATED_LOCALES } from "@/lib/i18n/paths";

// Header, footer and page width for the public directory pages. Pages
// are a narrow column for reading, unless the page's content is wrapped in
// a .page-wide element (mandir and event pages), which takes the full
// width of the header.
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-4 pb-10 has-[>.page-wide]:max-w-6xl sm:gap-8 sm:px-6 sm:pt-6 sm:has-[>.page-wide]:px-8">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

// The page width for headers, footers and wide pages.
export const wideClass = "mx-auto w-full max-w-6xl px-4 sm:px-8";

// The name, the main menu and the other language. On a phone the menu
// takes its own row, so every page stays one tap away. From tablet size
// up the header stays at the top as you scroll. The toran hangs below it,
// except where the page hangs its own over a bold moment.
export function SiteHeader({ toran = true }: { toran?: boolean }) {
  const t = pageT();
  // English, the translations that have been checked, and the page's own
  // language (so a draft page links back to English).
  const locale = pageLocale();
  const languages = (["en", ...TRANSLATED_LOCALES] as const)
    .filter((l) => l === "en" || LOCALES[l].ready || l === locale)
    .map((l) => ({ locale: l, name: LOCALES[l].name, lang: LOCALES[l].lang }));
  return (
    <>
      <header className="bg-bg/90 z-30 backdrop-blur-md sm:sticky sm:top-0">
        <div
          className={`${wideClass} flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5 sm:py-3`}
        >
          <Link
            href={localePath("/")}
            aria-label={t("shell.home")}
            className="text-ink shrink-0 no-underline"
          >
            <Logo />
          </Link>
          <SiteNav
            links={[
              { href: localePath("/whats-on"), label: t("shell.whatsOn") },
              { href: localePath("/seva"), label: t("shell.seva") },
              { href: localePath("/mandirs"), label: t("shell.mandirs") },
              { href: localePath("/festivals"), label: t("shell.festivals") },
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={localePath("/search")}
              aria-label={t("shell.search")}
              title={t("shell.search")}
              className="text-ink hover:bg-sunk inline-flex size-11 items-center justify-center rounded-full no-underline transition-colors"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
            </Link>
            <MyToranLink label={t("shell.my")} href={localePath("/my")} />
            <DisplaySettings />
            {languages.length > 1 && <LanguageSwitch languages={languages} />}
            <Link
              href="/for-mandirs"
              className="border-line-strong hover:border-peacock/60 text-ink hidden rounded-full border px-5 py-2 text-base font-semibold no-underline lg:inline-flex"
            >
              {t("shell.forMandirs")}
            </Link>
          </div>
        </div>
      </header>
      {toran && <Toran className="site-toran" />}
    </>
  );
}

// Pages about Toran itself, in English only.
const FOOTER_LINKS = {
  about: [
    { href: "/about", key: "shell.about" },
    { href: "/contact", key: "shell.contact" },
    { href: "/accessibility", key: "shell.accessibility" },
  ],
  data: [
    { href: "/privacy", key: "shell.privacy" },
    { href: "/terms", key: "shell.terms" },
    { href: "/corrections", key: "shell.corrections" },
  ],
} as const;

export function SiteFooter() {
  const t = pageT();
  const columns = [
    {
      heading: t("shell.find"),
      links: [
        { href: localePath("/whats-on"), label: t("shell.whatsOn") },
        { href: localePath("/seva"), label: t("shell.seva") },
        { href: localePath("/mandirs"), label: t("shell.mandirs") },
        { href: localePath("/festivals"), label: t("shell.festivals") },
        { href: localePath("/my"), label: t("shell.my") },
        { href: "/for-mandirs", label: t("shell.forMandirs") },
      ],
    },
    {
      heading: t("shell.toran"),
      links: FOOTER_LINKS.about.map(({ href, key }) => ({
        href,
        label: t(key),
      })),
    },
    {
      heading: t("shell.yourData"),
      links: FOOTER_LINKS.data.map(({ href, key }) => ({
        href,
        label: t(key),
      })),
    },
  ];
  return (
    <footer className="border-line text-muted mt-16 border-t sm:mt-24">
      <div
        className={`${wideClass} flex flex-wrap justify-between gap-x-12 gap-y-10 py-12 text-base sm:py-14`}
      >
        <div className="flex max-w-md flex-[1_1_20rem] flex-col gap-4">
          <span className="text-ink">
            <Logo size="sm" />
          </span>
          <p>{t("shell.footer")}</p>
          <InstallApp />
        </div>
        <nav
          aria-label={t("shell.footerLinks")}
          className="flex flex-wrap gap-x-12 gap-y-8"
        >
          {columns.map(({ heading, links }) => (
            <div key={heading} className="flex flex-col gap-2.5">
              <p className="text-ink font-semibold">{heading}</p>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    {/* Rarely opened from here, so not fetched ahead
                        (speed budget). */}
                    <Link
                      href={href}
                      prefetch={false}
                      className="hover:text-peacock no-underline hover:underline"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
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
    <div className="rise flex flex-col gap-3 pt-2 sm:gap-4 sm:pt-6">
      <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">
        {title}
      </h1>
      {intro && (
        <p className="text-muted max-w-prose text-lg leading-relaxed">
          {intro}
        </p>
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
  tone?: "quiet" | "marigold" | "peacock" | "kumkum" | "leaf";
  children: ReactNode;
}) {
  const colours = {
    quiet: "bg-sunk text-muted",
    marigold: "bg-marigold/15 text-marigold-ink",
    peacock: "bg-peacock/10 text-peacock",
    kumkum: "bg-kumkum/10 text-kumkum",
    leaf: "bg-leaf-tint text-leaf-ink",
  }[tone];
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-base font-semibold ${colours}`}
    >
      {children}
    </span>
  );
}
