import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Countdown } from "@/components/countdown";
import { DateTile } from "@/components/date-tile";
import { EventList } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { NearMe } from "@/components/near-me";
import { Toran } from "@/components/ornaments";
import { SiteFooter, SiteHeader, wideClass } from "@/components/public-shell";
import { buttonClass, inputClass } from "@/components/ui";
import { listFestivalDates, listMandirs } from "@/lib/directory";
import { EVENT_KINDS, kindLabel } from "@/lib/event-kinds";
import { formatDateRange } from "@/lib/format";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { getSeasonBanner } from "@/lib/season-banner";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";
import { siteUrl } from "@/lib/site";
import { siteData } from "@/lib/structured-data";
import { festivalText, localePath, pageT, seasonText } from "@/lib/i18n/page";
import { seasonBySlug } from "@/lib/seasons";
import { sevaSummary } from "@/lib/seva-needs";

// Only the address: the title, description and link preview picture come
// from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// The kinds of event offered as quick links under the search.
const QUICK_KINDS = ["festival", "aarti", "bhajan", "class"] as const;

// The home page until launch. Its bold moment is the welcome: a deep
// peacock band under a toran, with the search and the festivals coming
// up. Then the next few events, the mandirs by region, and a word for
// committees.
export default function Home() {
  const t = pageT();
  return (
    <>
      <JsonLd data={siteData(siteUrl())} />
      <SiteHeader toran={false} />
      <main className="flex w-full flex-1 flex-col">
        <section className="bg-night text-on-night relative overflow-hidden">
          <Toran night />
          <div
            aria-hidden="true"
            className="rangoli-art rangoli-art-night pointer-events-none absolute top-24 -right-40 size-[26rem] opacity-15 sm:top-12 sm:-right-32 sm:size-[44rem] sm:opacity-30"
          />
          <div
            className={`${wideClass} relative flex flex-wrap items-center gap-x-14 gap-y-12 pt-5 pb-16 sm:pt-10 sm:pb-24`}
          >
            <div className="rise flex min-w-0 flex-[1_1_32rem] flex-col gap-6 sm:gap-7">
              <div className="flex flex-wrap items-center gap-2">
                <p className="bg-on-night/10 inline-flex w-fit items-center gap-2 rounded-full px-4 py-1 text-base font-semibold">
                  <span
                    aria-hidden="true"
                    className="bg-night-accent size-2 animate-pulse rounded-full"
                  />
                  {t("home.comingSoon")}
                </p>
                <Suspense fallback={null}>
                  <SeasonLink />
                </Suspense>
              </div>
              <h1 className="font-display text-[3.25rem] leading-[0.98] tracking-tight sm:text-7xl lg:text-[5.5rem]">
                {t("home.tagline")}
              </h1>
              <p className="text-night-muted max-w-xl text-lg leading-relaxed sm:text-xl">
                {t("home.intro")}
              </p>

              <form
                action={localePath("/whats-on")}
                aria-label={t("home.searchTitle")}
                className="bg-surface text-ink flex max-w-2xl flex-col gap-3 rounded-3xl p-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)] sm:p-5"
              >
                <NearMe
                  page={localePath("/whats-on")}
                  labels={{
                    field: t("whatsOn.near"),
                    button: t("whatsOn.nearMe"),
                    finding: t("whatsOn.finding"),
                    denied: t("whatsOn.locationDenied"),
                    failed: t("whatsOn.locationFailed"),
                  }}
                  input={
                    <div className="flex flex-wrap gap-2">
                      <input
                        id="near"
                        name="near"
                        placeholder={t("whatsOn.nearExample")}
                        autoComplete="postal-code"
                        className={`${inputClass} min-w-0 flex-[1_1_12rem]`}
                      />
                      <button
                        type="submit"
                        className="bg-marigold inline-flex flex-[1_1_8rem] items-center justify-center rounded-full px-7 py-3 text-lg font-bold text-[#1b1a2c] transition hover:brightness-105 active:scale-[0.98]"
                      >
                        {t("whatsOn.show")}
                      </button>
                    </div>
                  }
                />
              </form>

              <nav aria-label={t("whatsOn.type")}>
                <ul className="flex flex-wrap gap-2">
                  {QUICK_KINDS.map((kind) => (
                    <li key={kind}>
                      <Link
                        href={`${localePath("/whats-on")}?type=${kind}`}
                        className="border-on-night/30 text-on-night hover:bg-on-night/10 inline-flex rounded-full border px-4 py-2 text-base font-medium no-underline transition-colors"
                      >
                        {kindLabel(kind) ?? EVENT_KINDS[kind]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="flex min-w-0 flex-[1_1_22rem] lg:justify-end">
              <Suspense fallback={null}>
                <FestivalsSoon />
              </Suspense>
            </div>
          </div>
        </section>

        <div
          className={`${wideClass} flex flex-col gap-20 pt-16 sm:gap-28 sm:pt-24`}
        >
          <div className="flex flex-wrap gap-x-16 gap-y-16">
            <Suspense fallback={null}>
              <ComingUp />
            </Suspense>
            <Suspense fallback={null}>
              <Mandirs />
            </Suspense>
          </div>

          <Suspense fallback={null}>
            <SevaSoon />
          </Suspense>

          <section
            aria-labelledby="committees"
            className="bg-sunk flex flex-wrap items-start gap-x-14 gap-y-10 rounded-[2rem] p-6 sm:p-12 lg:p-16"
          >
            <div className="flex min-w-0 flex-[1_1_24rem] flex-col gap-5">
              <p className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
                {t("shell.forMandirs")}
              </p>
              <h2
                id="committees"
                className="font-display text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl"
              >
                {t("home.committeesHeading")}
              </h2>
              <p className="text-muted max-w-lg text-lg">
                {t("home.committeesBody")}
              </p>
              <Link href="/for-mandirs" className={`${buttonClass} sm:w-fit`}>
                {t("home.committeesTitle")}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ol className="divide-line flex min-w-0 flex-[1_1_24rem] flex-col divide-y">
              {(
                [
                  "home.step1Title",
                  "home.step2Title",
                  "home.step3Title",
                ] as const
              ).map((title, i) => (
                <li
                  key={title}
                  className="flex items-center gap-6 py-5 first:pt-0"
                >
                  <span
                    aria-hidden="true"
                    className="font-display text-marigold-ink w-8 shrink-0 text-5xl leading-none"
                  >
                    {i + 1}
                  </span>
                  <span className="text-xl font-semibold">{t(title)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

// In the weeks before a festival season, a way straight to its page.
async function SeasonLink() {
  const season = await getSeasonBanner();
  if (!season) return null;
  const t = pageT();
  const { name } = seasonText(seasonBySlug(season.slug)!);
  return (
    <Link
      href={localePath(`/${season.slug}`)}
      className="bg-night-accent/15 text-night-accent hover:bg-night-accent/25 inline-flex w-fit rounded-full px-4 py-1 text-base font-semibold no-underline transition-colors"
    >
      {t("festival.atMandirs", { name })}
      <span aria-hidden="true">{" →"}</span>
    </Link>
  );
}

// The next three festivals, each once, on a card in the welcome.
async function FestivalsSoon() {
  const t = pageT();
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
    <section
      aria-labelledby="festivals-soon"
      className="bg-surface text-ink w-full max-w-md rounded-3xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-7"
    >
      <h2
        id="festivals-soon"
        className="font-display text-[2rem] leading-tight"
      >
        {t("home.festivalsSoon")}
      </h2>
      <ul className="divide-line mt-2 flex flex-col divide-y">
        {next.map((d) => {
          const when = formatDateRange(d.starts_on, d.ends_on);
          return (
            <li
              key={d.id}
              className="has-card-link group flex items-center gap-4 py-4"
            >
              <DateTile date={d.starts_on} label={when} size="sm" />
              <span className="flex min-w-0 flex-col items-start gap-1">
                <Link
                  href={localePath(`/festivals/${d.festival!.slug}`)}
                  className="card-link group-hover:text-peacock text-lg leading-snug font-semibold no-underline"
                >
                  {festivalText(d.festival!.slug, d.festival!).name}
                </Link>
                <Countdown date={d.starts_on} />
              </span>
            </li>
          );
        })}
      </ul>
      <Link
        href={localePath("/festivals")}
        className="text-peacock mt-2 inline-block font-semibold"
      >
        {t("home.allFestivals")} →
      </Link>
    </section>
  );
}

// Seva being asked for, with the way to the Seva page. Nothing when no
// mandir is asking.
async function SevaSoon() {
  const t = pageT();
  const seva = await sevaSummary();
  if (!seva?.events) return null;
  return (
    <section
      aria-labelledby="seva-soon"
      className="border-line bg-surface shadow-card flex flex-wrap items-center gap-x-10 gap-y-5 rounded-[2rem] border p-6 sm:p-10"
    >
      <div className="flex min-w-0 flex-[1_1_24rem] flex-col gap-3">
        <h2
          id="seva-soon"
          className="font-display text-4xl leading-tight tracking-tight sm:text-5xl"
        >
          {t("home.sevaTitle")}
        </h2>
        <p className="text-muted text-lg">{t("sevaList.intro")}</p>
      </div>
      <div className="flex flex-col items-start gap-3">
        <p className="text-leaf-ink text-xl font-semibold">
          {t.count("sevaList.count", seva.events)} ·{" "}
          {t.count("sevaList.free", seva.places)}
        </p>
        <Link href={localePath("/seva")} className={buttonClass}>
          {t("home.sevaLink")}
        </Link>
      </div>
    </section>
  );
}

// The next few events anywhere, straight from What's on.
async function ComingUp() {
  const t = pageT();
  const result = await listUpcomingEvents();
  if (result.state !== "ok" || result.data.length === 0) return null;
  const next = result.data.filter((e) => e.status === "published").slice(0, 5);
  return (
    <section
      aria-labelledby="coming-up"
      className="flex min-w-0 flex-[999_1_34rem] flex-col gap-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="coming-up"
          className="font-display text-5xl leading-tight tracking-tight sm:text-6xl"
        >
          {t("home.comingUp")}
        </h2>
        <Link
          href={localePath("/whats-on")}
          className="text-peacock text-lg font-semibold"
        >
          {t("home.seeAll")} →
        </Link>
      </div>
      <EventList events={nearTo(next, null, 0)} />
    </section>
  );
}

// How many mandirs are listed, region by region. The way to the mandir
// list shows even when the counts can't be loaded.
async function Mandirs() {
  const t = pageT();
  const result = await listMandirs();
  const browse = (
    <Link
      href={localePath("/mandirs")}
      className={`${buttonClass} mt-2 sm:w-fit`}
    >
      {t("home.mandirs")}
    </Link>
  );
  if (result.state !== "ok" || result.data.length === 0) {
    return <p className="flex min-w-0 flex-[1_1_20rem]">{browse}</p>;
  }
  const counts = new Map<string, number>();
  for (const m of result.data) {
    counts.set(m.region, (counts.get(m.region) ?? 0) + 1);
  }
  const regions = [...counts].sort((a, b) => b[1] - a[1]);
  return (
    <section
      aria-labelledby="mandirs"
      className="flex min-w-0 flex-[1_1_20rem] flex-col gap-4"
    >
      <h2
        id="mandirs"
        className="font-display text-4xl leading-tight tracking-tight sm:text-5xl"
      >
        {t("home.mandirCount", { count: result.data.length })}
      </h2>
      <p className="text-muted">{t("home.mandirsIntro")}</p>
      <ul className="border-line mt-2 flex flex-col border-t">
        {regions.map(([region, count]) => {
          const key = regionKey(region);
          return (
            <li
              key={region}
              className="border-line flex justify-between gap-4 border-b py-3"
            >
              <span className="font-semibold">{key ? t(key) : region}</span>
              <span className="text-muted">
                {t.count("home.regionCount", count)}
              </span>
            </li>
          );
        })}
      </ul>
      {browse}
    </section>
  );
}
