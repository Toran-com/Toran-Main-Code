import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/public-shell";
import { ToranGarland } from "@/components/toran-garland";
import { buttonClass, cardClass, quietButtonClass } from "@/components/ui";
import { site, siteUrl } from "@/lib/site";
import { siteData } from "@/lib/structured-data";
import { translator } from "@/lib/i18n";

// Only the address: the title, description and link preview picture come
// from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// The home page until launch: what Toran is, and the way in to each part.
export default function ComingSoon() {
  const t = translator();
  return (
    <>
      <JsonLd data={siteData(siteUrl())} />
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="rangoli absolute top-0 right-0 h-44 w-1/2 sm:h-full"
          />
          <div className="rise relative mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pt-12 pb-12 sm:px-6 sm:pt-20">
            <ToranGarland className="sway h-12 w-56" decorative />
            <p className="border-marigold/40 bg-surface/80 text-marigold-ink inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1 text-base font-semibold">
              <span
                aria-hidden="true"
                className="bg-marigold size-2 animate-pulse rounded-full"
              />
              {t("home.comingSoon")}
            </p>
            <div className="flex flex-col gap-4">
              <h1 className="font-display text-6xl font-extrabold tracking-tight sm:text-7xl">
                {site.name}
              </h1>
              <p className="font-display text-peacock text-2xl font-bold sm:text-3xl">
                {t("home.tagline")}
              </p>
              <p className="text-muted max-w-prose text-lg leading-relaxed">
                {t("home.intro")}
              </p>
            </div>
            <nav aria-label="Explore" className="flex flex-wrap gap-3">
              <Link href="/whats-on" className={`${buttonClass} sm:w-auto`}>
                {t("home.whatsOn")}
              </Link>
              <Link
                href="/mandirs"
                className={`${quietButtonClass} w-full sm:w-auto`}
              >
                {t("home.mandirs")}
              </Link>
              <Link
                href="/festivals"
                className={`${quietButtonClass} w-full sm:w-auto`}
              >
                {t("home.festivals")}
              </Link>
            </nav>
          </div>
        </section>

        <ul className="rise-list mx-auto grid w-full max-w-3xl gap-4 px-4 pb-16 sm:grid-cols-3 sm:px-6">
          <Feature
            href="/whats-on"
            title={t("home.eventsTitle")}
            body={t("home.eventsBody")}
            icon={<CalendarIcon />}
          />
          <Feature
            href="/for-mandirs"
            title={t("home.committeesTitle")}
            body={t("home.committeesBody")}
            icon={<MandirIcon />}
          />
          <Feature
            href="/festivals"
            title={t("home.festivalsTitle")}
            body={t("home.festivalsBody")}
            icon={<DiyaIcon />}
          />
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}

function Feature({
  href,
  title,
  body,
  icon,
}: {
  href: string;
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <li
      className={`${cardClass} lift has-card-link group flex flex-col gap-3 p-5`}
    >
      <span className="bg-marigold/15 text-marigold-ink grid size-12 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
        {icon}
      </span>
      <h2 className="font-display text-xl font-bold">
        <Link
          href={href}
          className="card-link group-hover:text-peacock no-underline"
        >
          {title}
          {/* Kept on the same line as the last word, and nudged on hover. */}
          <span
            aria-hidden="true"
            className="relative left-0 transition-[left] duration-200 group-hover:left-1"
          >
            {"\u00a0→"}
          </span>
        </Link>
      </h2>
      <p className="text-muted">{body}</p>
    </li>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-6",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// A mandir: a shikhara with a flag over a doorway.
function MandirIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 2.5v3M12 2.5l3 1.2-3 1.2" />
      <path d="M12 5.5c-2.5 2.2-4 4.6-4 7.5h8c0-2.9-1.5-5.3-4-7.5z" />
      <path d="M4.5 21v-8h15v8M3 21h18" />
      <path d="M10 21v-3.5a2 2 0 0 1 4 0V21" />
    </svg>
  );
}

// A diya, the clay lamp lit at festivals.
function DiyaIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3.5c1.6 1.8 2.2 3.4 1.8 4.7a1.9 1.9 0 0 1-3.6 0C9.8 6.9 10.4 5.3 12 3.5z" />
      <path d="M3.5 12.5c2.5 0 3.5 1 8.5 1s6-1 8.5-1c-.5 4-3.8 7-8.5 7s-8-3-8.5-7z" />
      <path d="M9 19.5h6" />
    </svg>
  );
}
