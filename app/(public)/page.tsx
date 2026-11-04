import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Countdown } from "@/components/countdown";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { LineIcon, type LineIconName } from "@/components/line-icons";
import { Toran } from "@/components/ornaments";
import { RememberPlace } from "@/components/remember-place";
import { YourMandirs, type MandirBrief } from "@/components/your-mandirs";
import { SiteFooter, SiteHeader, wideClass } from "@/components/public-shell";
import { buttonClass, quietButtonClass } from "@/components/ui";
import { listFestivalDates, listMandirs } from "@/lib/directory";
import { EVENT_KINDS, kindLabel } from "@/lib/event-kinds";
import { formatDateRange, formatEventStart } from "@/lib/format";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { getSeasonBanner } from "@/lib/season-banner";
import {
  listUpcomingEvents,
  positionForSearch,
  type ListedEvent,
} from "@/lib/whats-on";
import { eventPath } from "@/lib/share";
import { nearestFirstEachDay, nearTo, radiusFrom } from "@/lib/whats-on-view";
import { siteUrl } from "@/lib/site";
import { siteData } from "@/lib/structured-data";
import {
  festivalText,
  localePath,
  pageLocale,
  pageT,
  seasonText,
} from "@/lib/i18n/page";
import { seasonBySlug } from "@/lib/seasons";
import { sevaSummary } from "@/lib/seva-needs";

// Only the address: the title, description and link preview picture come
// from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// The kinds of event offered as quick links under the search.
const QUICK_KINDS = ["festival", "aarti", "bhajan", "class"] as const;

// What Toran does differently, one statement at a time as you scroll.
const WHY = [
  { icon: "decorations", title: "home.why1Title", body: "home.why1Body" },
  { icon: "pin", title: "home.why2Title", body: "home.why2Body" },
  { icon: "heart", title: "home.why3Title", body: "home.why3Body" },
] as const satisfies readonly {
  icon: LineIconName;
  title: string;
  body: string;
}[];

// The home page (DESIGN.md): one midnight welcome, its headline in the
// middle, the main button in gold and a lit diya that glows brighter as
// you scroll; then the festivals coming up as cards to swipe, what Toran
// does in three lines that rise in one by one, the next events, the
// mandirs by region, and a midnight band for committees.
export default function Home({ searchParams }: PageProps<"/">) {
  const t = pageT();
  return (
    <>
      <JsonLd data={siteData(siteUrl())} />
      <SiteHeader toran={false} />
      <main className="flex min-h-[100svh] w-full flex-1 flex-col">
        <section className="bg-night text-on-night relative overflow-hidden">
          <Toran night />
          <div
            className={`${wideClass} relative flex flex-col items-center gap-6 pt-8 pb-4 text-center sm:gap-8 sm:pt-16`}
          >
            <div className="rise flex flex-wrap items-center justify-center gap-2">
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
            <h1 className="rise font-display max-w-5xl text-[3.25rem] leading-[1.02] tracking-tight sm:text-7xl lg:text-[6rem]">
              {t("home.tagline")}
            </h1>
            <p className="rise text-night-muted max-w-2xl text-xl leading-relaxed sm:text-2xl">
              {t("home.intro")}
            </p>
            <div className="rise flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href={localePath("/whats-on")}
                className="bg-night-accent text-night inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-xl font-bold no-underline shadow-[0_18px_44px_rgba(0,0,0,0.3)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
              >
                <LineIcon name="pin" />
                {t("home.findNear")}
              </Link>
              <Link
                href={localePath("/festivals")}
                className="border-on-night/70 text-on-night hover:bg-on-night/10 inline-flex w-full items-center justify-center rounded-full border-2 px-8 py-[0.875rem] text-xl font-bold no-underline transition sm:w-auto"
              >
                {t("home.allFestivals")}
              </Link>
            </div>
            <nav aria-label={t("whatsOn.type")} className="rise">
              <ul className="flex flex-wrap justify-center gap-2">
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
            <HeroDiya />
          </div>
        </section>

        <div
          className={`${wideClass} flex flex-col gap-24 pt-16 sm:gap-32 sm:pt-24`}
        >
          <Suspense fallback={null}>
            <FestivalsSoon />
          </Suspense>

          <Suspense fallback={null}>
            <Followed />
          </Suspense>

          <section aria-labelledby="why" className="flex flex-col gap-10">
            <h2
              id="why"
              className="reveal font-display max-w-3xl text-5xl leading-[1.05] tracking-tight sm:text-7xl"
            >
              {t("home.whyTitle")}
            </h2>
            <ol className="grid gap-x-10 gap-y-12 md:grid-cols-3">
              {WHY.map(({ icon, title, body }) => (
                <li key={title} className="reveal flex flex-col gap-4">
                  <span className="bg-night text-night-accent grid size-14 place-items-center rounded-2xl">
                    <LineIcon name={icon} className="size-7" />
                  </span>
                  <h3 className="font-display text-3xl leading-tight sm:text-4xl">
                    {t(title)}
                  </h3>
                  <p className="text-muted max-w-md text-lg leading-relaxed">
                    {t(body)}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-wrap gap-x-16 gap-y-16">
            <Suspense fallback={null}>
              <ComingUp searchParams={searchParams} />
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
            className="reveal bg-night text-on-night relative flex flex-wrap items-start gap-x-14 gap-y-10 overflow-hidden rounded-[2rem] p-6 sm:p-12 lg:p-16"
          >
            <div className="flex min-w-0 flex-[1_1_24rem] flex-col gap-5">
              <p className="text-night-accent text-base font-semibold tracking-[0.12em] uppercase">
                {t("shell.forMandirs")}
              </p>
              <h2
                id="committees"
                className="font-display text-[2.5rem] leading-[1.05] tracking-tight sm:text-6xl"
              >
                {t("home.committeesHeading")}
              </h2>
              <p className="text-night-muted max-w-lg text-lg">
                {t("home.committeesBody")}
              </p>
              <Link
                href="/for-mandirs"
                className="bg-night-accent text-night inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-lg font-bold no-underline transition hover:brightness-105 active:scale-[0.98] sm:w-fit"
              >
                {t("home.committeesTitle")}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ol className="divide-on-night/15 flex min-w-0 flex-[1_1_24rem] flex-col divide-y">
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
                    className="font-display text-night-accent w-8 shrink-0 text-5xl leading-none"
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

// A lit diya in gold line, under the welcome. Its flame moves gently, and
// it grows and glows as you scroll past (app/globals.css, .hero-diya).
// Decoration only.
function HeroDiya() {
  return (
    <div aria-hidden="true" className="hero-diya relative mt-4 w-56 sm:w-72">
      <div className="hero-diya-glow absolute inset-x-0 top-0 mx-auto aspect-square w-full rounded-full" />
      <svg viewBox="0 0 200 200" className="relative w-full" fill="none">
        <g className="hero-diya-flame">
          <path
            d="M100 28c15 19 21 33 21 45a21 21 0 0 1-42 0c0-12 6-26 21-45z"
            fill="#d9a441"
          />
          <path
            d="M100 56c6 8 8 13.5 8 18a8 8 0 0 1-16 0c0-4.5 2-10 8-18z"
            fill="#f6e7b8"
          />
        </g>
        <path
          d="M100 94v12"
          stroke="#d9a441"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M26 116h148c-6 34-36 56-74 56s-68-22-74-56z"
          stroke="#d9a441"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M48 134c14 9 32 14 52 14s38-5 52-14"
          stroke="#d9a441"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {[44, 72, 100, 128, 156].map((x) => (
          <circle key={x} cx={x} cy="116" r="3.5" fill="#d9a441" />
        ))}
      </svg>
    </div>
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
      className="bg-night-accent/15 text-night-accent hover:bg-night-accent/25 inline-flex w-fit gap-1.5 rounded-full px-4 py-1 text-base font-semibold no-underline transition-colors"
    >
      {t("festival.atMandirs", { name })}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

// The next festivals, each once, as large cards in a row to swipe
// through (they snap into place), with the date big and the days to go.
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
    .slice(0, 6);
  if (!next.length) return null;
  return (
    <section aria-labelledby="festivals-soon" className="flex flex-col gap-6">
      <div className="reveal flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="festivals-soon"
          className="font-display text-5xl leading-tight tracking-tight sm:text-6xl"
        >
          {t("home.festivalsSoon")}
        </h2>
        <Link
          href={localePath("/festivals")}
          className="text-peacock text-lg font-semibold"
        >
          {t("home.allFestivals")} →
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:-mx-12 lg:scroll-px-12 lg:px-12">
        {next.map((d) => {
          const when = formatDateRange(d.starts_on, d.ends_on);
          const day = new Date(`${d.starts_on}T12:00:00Z`);
          return (
            <li
              key={d.id}
              className="reveal lift has-card-link group border-line bg-surface shadow-card flex w-[17rem] shrink-0 snap-start flex-col gap-6 rounded-3xl border p-6 sm:w-[19rem]"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-display text-peacock text-6xl leading-none">
                  {day.getUTCDate()}
                </span>
                <span className="text-muted text-lg font-semibold">{when}</span>
              </span>
              <span className="mt-auto flex flex-col items-start gap-2">
                <Link
                  href={localePath(`/festivals/${d.festival!.slug}`)}
                  className="card-link font-display group-hover:text-peacock text-3xl leading-tight no-underline"
                >
                  {festivalText(d.festival!.slug, d.festival!).name}
                </Link>
                <Countdown date={d.starts_on} />
              </span>
            </li>
          );
        })}
      </ul>
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
      className="reveal border-line bg-surface shadow-card flex flex-wrap items-center gap-x-10 gap-y-5 rounded-[2rem] border p-6 sm:p-10"
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

// The next few events, straight from What's on: near the place this
// phone chose before (RememberPlace brings it here as ?near=), or
// anywhere.
async function ComingUp({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const t = pageT();
  const query = await searchParams;
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);
  const [result, origin] = await Promise.all([
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);
  if (result.state !== "ok" || result.data.length === 0) return null;
  const published = result.data.filter((e) => e.status === "published");
  const position = origin && origin !== "unavailable" ? origin : null;
  const nearby = position
    ? nearestFirstEachDay(nearTo(published, position, within)).slice(0, 5)
    : [];
  const place = near.toUpperCase();
  const params = new URLSearchParams({ near });
  if (within !== 15) params.set("within", String(within));
  return (
    <section
      aria-labelledby="coming-up"
      className="flex min-w-0 flex-[999_1_34rem] flex-col gap-4"
    >
      <RememberPlace
        page={localePath("/")}
        near={near}
        within={within}
        status={
          !near
            ? "none"
            : origin === "unavailable"
              ? "unavailable"
              : origin
                ? "found"
                : "unknown"
        }
      />
      <div className="reveal flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="coming-up"
          className="font-display text-5xl leading-tight tracking-tight sm:text-6xl"
        >
          {nearby.length
            ? t("home.comingUpNear", { place })
            : t("home.comingUp")}
        </h2>
        <Link
          href={localePath(nearby.length ? `/whats-on?${params}` : "/whats-on")}
          className="text-peacock text-lg font-semibold"
        >
          {t("home.seeAll")} →
        </Link>
      </div>
      <EventList
        events={nearby.length ? nearby : nearTo(published.slice(0, 5), null, 0)}
      />
      {/* Only the next five here; the rest is one tap away at the end too. */}
      <Link
        href={localePath(nearby.length ? `/whats-on?${params}` : "/whats-on")}
        className={`${quietButtonClass} self-start no-underline`}
      >
        {t("home.seeAll")} →
      </Link>
      {nearby.length > 0 && (
        <p className="text-muted text-base">{POSTCODE_CREDIT}</p>
      )}
    </section>
  );
}

// "Your mandirs": every mandir's name and next event, for the browser to
// show the ones this phone follows (components/your-mandirs.tsx).
async function Followed() {
  const [mandirs, events] = await Promise.all([
    listMandirs(),
    listUpcomingEvents(),
  ]);
  if (mandirs.state !== "ok") return null;
  const gujarati = pageLocale() === "gu";
  const next = new Map<string, ListedEvent>();
  for (const e of events.state === "ok" ? events.data : []) {
    if (e.status !== "published") continue;
    const soonest = next.get(e.mandir.slug);
    if (!soonest || e.next_starts_at < soonest.next_starts_at) {
      next.set(e.mandir.slug, e);
    }
  }
  const brief: Record<string, MandirBrief> = {};
  for (const m of mandirs.data) {
    const e = next.get(m.slug);
    brief[m.slug] = {
      name: m.name,
      path: localePath(`/mandirs/${m.slug}`),
      next: e
        ? {
            title: (gujarati && e.title_gu) || e.title,
            when: formatEventStart(e.next_starts_at, e.all_day),
            path: localePath(eventPath(m.slug, e.id)),
          }
        : null,
    };
  }
  return <YourMandirs mandirs={brief} />;
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
      className="reveal flex min-w-0 flex-[1_1_20rem] flex-col gap-4"
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
