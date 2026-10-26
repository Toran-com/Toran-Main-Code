import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventList } from "@/components/event-list";
import { JsonLd } from "@/components/json-ld";
import { Toran } from "@/components/ornaments";
import { LoadProblem } from "@/components/public-shell";
import { SeasonDays } from "@/components/season-page";
import { ShareButtons } from "@/components/share-buttons";
import { Loading } from "@/components/ui";
import { listFestivalDates, listMandirs } from "@/lib/directory";
import { seasonDays, seasonEvents, seasonWindow } from "@/lib/festival-season";
import { localePath, pageT, seasonText } from "@/lib/i18n/page";
import type { Season } from "@/lib/seasons";
import { pageMetadata, site, siteUrl } from "@/lib/site";
import { breadcrumbData } from "@/lib/structured-data";
import { townNamed, townSlug } from "@/lib/towns";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";

// A festival season in one town (/diwali/leicester): the festival days,
// the season's events at that town's mandirs, and the mandirs themselves,
// for people who search "Diwali in Leicester". Only towns with a mandir
// on Toran have one; while a town has no events for the season the page
// still works but isn't offered to search engines.

// The town an address names, or null.
async function townOf(slug: string): Promise<string | null> {
  const mandirs = await listMandirs();
  return mandirs.state === "ok" ? townNamed(slug, mandirs.data) : null;
}

// The season's events at the town's mandirs (empty if they can't load).
async function townEvents(season: Season, slug: string) {
  const [dates, events] = await Promise.all([
    listFestivalDates(),
    listUpcomingEvents(),
  ]);
  if (dates.state !== "ok" || events.state !== "ok") return null;
  // The dates already start from today (listFestivalDates), so no "today"
  // is needed and the page can be saved.
  const window = seasonWindow(seasonDays(dates.data, season, ""));
  if (!window) return [];
  return seasonEvents(events.data, season, window).filter(
    (e) => townSlug(e.mandir.town) === slug,
  );
}

// Town pages aren't built ahead of time (seven seasons, two languages and
// every town would be some 1,600 pages): each is made on its first visit
// and kept, as a mandir added after the build is, so an unknown town still
// gets a proper 404. The build checks the page against one made-up town.
export function seasonTownParams(): { town: string }[] {
  return [{ town: "no-such-town" }];
}

export async function seasonTownMetadata(
  season: Season,
  slug: string,
): Promise<Metadata> {
  const t = pageT();
  const town = await townOf(slug);
  if (!town) return {};
  const { name } = seasonText(season);
  const events = await townEvents(season, slug);
  return {
    ...pageMetadata(
      t("season.inTown", { name, town }),
      t("season.townDescription", { name, town }),
      localePath(`/${season.slug}/${slug}`),
    ),
    // Nothing listed there yet: not worth a place in search results.
    // (Before launch nothing is listed or followed, as everywhere.)
    ...(!events?.length && {
      robots: { index: false, follow: site.launched },
    }),
  };
}

export async function SeasonTownPage({
  season,
  slug,
}: {
  season: Season;
  slug: string;
}) {
  const t = pageT();
  const town = await townOf(slug);
  if (!town) notFound();
  const text = seasonText(season);
  return (
    <>
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}${localePath("/")}` },
          {
            name: text.name,
            url: `${siteUrl()}${localePath(`/${season.slug}`)}`,
          },
          {
            name: town,
            url: `${siteUrl()}${localePath(`/${season.slug}/${slug}`)}`,
          },
        ])}
      />
      <header className="own-toran bg-night text-on-night rise relative overflow-hidden rounded-[2rem]">
        <Toran night />
        <div className="relative flex flex-col gap-4 px-5 pt-2 pb-8 sm:px-10 sm:pb-10">
          <Link
            href={localePath(`/${season.slug}`)}
            className="text-night-accent self-start font-semibold"
          >
            ← {t("season.acrossUk", { name: text.name })}
          </Link>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            {t("season.inTown", { name: text.name, town })}
          </h1>
          <Suspense fallback={null}>
            <SeasonDays season={season} />
          </Suspense>
        </div>
      </header>
      <Suspense fallback={<Loading />}>
        <TownBody season={season} slug={slug} town={town} />
      </Suspense>
    </>
  );
}

async function TownBody({
  season,
  slug,
  town,
}: {
  season: Season;
  slug: string;
  town: string;
}) {
  const t = pageT();
  const text = seasonText(season);
  // Saved like a mandir's page (refreshed when events change), so dates
  // are written out rather than "Today" and "Tomorrow".
  const [events, mandirs] = await Promise.all([
    townEvents(season, slug),
    listMandirs(),
  ]);
  const here =
    mandirs.state === "ok"
      ? mandirs.data.filter((m) => townSlug(m.town) === slug)
      : [];

  return (
    <>
      {events === null ? (
        <LoadProblem state="unavailable" what={t("load.eventList")} />
      ) : events.length ? (
        <section aria-labelledby="events" className="flex flex-col gap-4">
          <h2
            id="events"
            className="font-display text-3xl leading-tight sm:text-4xl"
          >
            {t("season.townEvents", { name: text.name, town })}
          </h2>
          <p className="text-muted" aria-live="polite">
            {t.count("whatsOn.count", events.length)}
          </p>
          <EventList events={nearTo(events, null, 0)} />
        </section>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">
            {t("season.noneInTown", { name: text.name, town })}
          </p>
          <p className="text-muted">
            <Link
              href={localePath(`/${season.slug}`)}
              className="text-peacock underline"
            >
              {t("season.acrossUk", { name: text.name })}
            </Link>
          </p>
        </div>
      )}

      {here.length > 0 && (
        <section aria-labelledby="mandirs" className="flex flex-col gap-3">
          <h2 id="mandirs" className="text-xl font-semibold sm:text-2xl">
            {t("season.townMandirs", { town })}
          </h2>
          <ul className="flex flex-col gap-2">
            {here.map((m) => (
              <li key={m.slug}>
                <Link
                  href={localePath(`/mandirs/${m.slug}`)}
                  className="text-peacock font-semibold underline"
                >
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <p className="font-semibold">{t("season.tellFamily")}</p>
        <ShareButtons
          label={t("season.share", { name: text.name })}
          text={t("season.townShareText", { name: text.name, town })}
          path={localePath(`/${season.slug}/${slug}`)}
        />
      </div>
    </>
  );
}
