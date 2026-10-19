import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventList } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { NearMe } from "@/components/near-me";
import { SiteFooter, SiteHeader } from "@/components/public-shell";
import { ToranGarland } from "@/components/toran-garland";
import {
  buttonClass,
  cardClass,
  inputClass,
  quietButtonClass,
} from "@/components/ui";
import { listFestivalDates } from "@/lib/directory";
import { formatDateRange } from "@/lib/format";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";
import { site, siteUrl } from "@/lib/site";
import { siteData } from "@/lib/structured-data";
import { translator } from "@/lib/i18n";

// Only the address: the title, description and link preview picture come
// from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// The home page until launch: what Toran is, a way straight in to what's
// on near you, the next few events and festivals, and a word for
// committees.
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
          <div className="rise relative mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-8 pb-8 sm:gap-7 sm:px-6 sm:pt-16">
            <ToranGarland
              className="sway h-10 w-48 sm:h-12 sm:w-56"
              decorative
            />
            <p className="border-marigold/40 bg-surface/80 text-marigold-ink inline-flex w-fit items-center gap-2 rounded-full border px-4 py-1 text-base font-semibold">
              <span
                aria-hidden="true"
                className="bg-marigold size-2 animate-pulse rounded-full"
              />
              {t("home.comingSoon")}
            </p>
            <div className="flex flex-col gap-3">
              <h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-7xl">
                {site.name}
              </h1>
              <p className="font-display text-peacock text-2xl font-bold sm:text-3xl">
                {t("home.tagline")}
              </p>
              <p className="text-muted max-w-prose leading-relaxed sm:text-lg">
                {t("home.intro")}
              </p>
            </div>

            <form
              action="/whats-on"
              className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4 sm:p-5"
            >
              <h2 className="font-display text-xl font-bold">
                {t("home.searchTitle")}
              </h2>
              <NearMe
                labels={{
                  field: t("whatsOn.near"),
                  button: t("whatsOn.nearMe"),
                  finding: t("whatsOn.finding"),
                  denied: t("whatsOn.locationDenied"),
                  failed: t("whatsOn.locationFailed"),
                }}
                input={
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      id="near"
                      name="near"
                      placeholder={t("whatsOn.nearExample")}
                      autoComplete="postal-code"
                      className={`${inputClass} min-w-0`}
                    />
                    <button type="submit" className={`${buttonClass} px-6`}>
                      {t("whatsOn.show")}
                    </button>
                  </div>
                }
              />
            </form>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-16 sm:px-6">
          <Suspense fallback={null}>
            <ComingUp />
          </Suspense>
          <Suspense fallback={null}>
            <FestivalsSoon />
          </Suspense>

          <section
            className={`${cardClass} lift has-card-link group flex items-start gap-4 p-5`}
          >
            <span className="bg-marigold/15 text-marigold-ink grid size-12 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <MandirIcon />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-xl font-bold">
                <Link
                  href="/for-mandirs"
                  className="card-link group-hover:text-peacock no-underline"
                >
                  {t("home.committeesCta")}
                </Link>
                <span aria-hidden="true" className="text-peacock">
                  {"\u00a0→"}
                </span>
              </h2>
              <p className="text-muted">{t("home.committeesBody")}</p>
            </div>
          </section>

          <p>
            <Link
              href="/mandirs"
              className={`${quietButtonClass} w-full sm:w-auto`}
            >
              {t("home.mandirs")}
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// The next few events anywhere, straight from What's on.
async function ComingUp() {
  const t = translator();
  const result = await listUpcomingEvents();
  if (result.state !== "ok" || result.data.length === 0) return null;
  const next = result.data.filter((e) => e.status === "published").slice(0, 4);
  return (
    <section aria-labelledby="coming-up" className="flex flex-col gap-4">
      <h2
        id="coming-up"
        className="font-display text-2xl font-bold sm:text-3xl"
      >
        {t("home.comingUp")}
      </h2>
      <EventList events={nearTo(next, null, 0)} />
      <Link href="/whats-on" className="text-peacock w-fit font-semibold">
        {t("home.seeAll")} →
      </Link>
    </section>
  );
}

// The next three festivals, each once.
async function FestivalsSoon() {
  const t = translator();
  const result = await listFestivalDates();
  if (result.state !== "ok") return null;
  const seen = new Set<string>();
  const next = result.data
    .filter((d) => {
      if (!d.festival || seen.has(d.festival.slug)) return false;
      seen.add(d.festival.slug);
      return true;
    })
    .slice(0, 3);
  if (!next.length) return null;
  return (
    <section aria-labelledby="festivals-soon" className="flex flex-col gap-4">
      <h2
        id="festivals-soon"
        className="font-display text-2xl font-bold sm:text-3xl"
      >
        {t("home.festivalsSoon")}
      </h2>
      <ul className="rise-list grid gap-3 sm:grid-cols-3">
        {next.map((d) => (
          <li
            key={d.id}
            className={`${cardClass} lift has-card-link group flex items-start gap-3 p-4`}
          >
            <span className="bg-marigold/15 text-marigold-ink grid size-10 shrink-0 place-items-center rounded-xl">
              <DiyaIcon />
            </span>
            <span className="flex flex-col">
              <Link
                href={`/festivals/${d.festival!.slug}`}
                className="card-link group-hover:text-peacock text-lg font-bold no-underline"
              >
                {d.festival!.name}
              </Link>
              <span className="text-marigold-ink font-semibold">
                {formatDateRange(d.starts_on, d.ends_on)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <Link href="/festivals" className="text-peacock w-fit font-semibold">
        {t("home.allFestivals")} →
      </Link>
    </section>
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
