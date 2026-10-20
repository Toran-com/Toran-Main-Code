import { seasonOf } from "@/lib/seasons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DateTile } from "@/components/date-tile";
import { EventList } from "@/components/event-list";
import { Toran } from "@/components/ornaments";
import { Badge, LoadProblem } from "@/components/public-shell";
import { cardClass } from "@/components/ui";
import { ShareButtons } from "@/components/share-buttons";
import { getFestival, listFestivals } from "@/lib/directory";
import { mentionsFestival } from "@/lib/festival-words";
import { calendarLabel, formatDateRange, londonDate } from "@/lib/format";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData } from "@/lib/structured-data";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";
import { festivalText, localePath, pageT, seasonText } from "@/lib/i18n/page";

// Every festival page is fully static, refreshed when festival dates or
// events change.
export const ensureStatic = "navigation";

const NO_FESTIVALS = "no-festivals-yet";

export async function generateStaticParams() {
  const result = await listFestivals();
  const slugs = result.state === "ok" ? result.data.map((f) => f.slug) : [];
  return (slugs.length ? slugs : [NO_FESTIVALS]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/festivals/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getFestival(slug);
  if (result.state !== "ok" || !result.data) return { title: pageTitle() };
  const { dates } = result.data;
  const { name } = festivalText(slug, result.data);
  const year = dates[0]?.starts_on.slice(0, 4);
  const t = pageT();
  return pageMetadata(
    year
      ? t("festival.titleYear", { name, year })
      : t("festival.title", { name }),
    t("festival.description", { name }),
    localePath(`/festivals/${slug}`),
  );
}

export default async function FestivalPage({
  params,
}: PageProps<"/festivals/[slug]">) {
  const { slug } = await params;
  const [result, events] = await Promise.all([
    getFestival(slug),
    listUpcomingEvents(),
  ]);
  if (result.state === "not connected") notFound();
  const t = pageT();
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what={t("load.festivalPage")} />;
  }
  if (!result.data) notFound();
  const festival = { ...result.data, ...festivalText(slug, result.data) };
  const season = seasonOf(festival.slug);

  // Events during the festival whose title or description mentions it.
  const during =
    events.state === "ok"
      ? events.data.filter((e) => {
          const day = londonDate(new Date(e.next_starts_at));
          return (
            festival.dates.some(
              (d) => day >= d.starts_on && day <= d.ends_on,
            ) && mentionsFestival(slug, `${e.title} ${e.summary ?? ""}`)
          );
        })
      : [];

  const next = festival.dates[0];
  return (
    <div className="page-wide flex flex-col gap-10 sm:gap-14">
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: t("shell.festivals"), url: `${siteUrl()}/festivals` },
          { name: festival.name, url: `${siteUrl()}/festivals/${slug}` },
        ])}
      />
      <div className="flex flex-col gap-4">
        <Link
          href={localePath("/festivals")}
          className="text-peacock self-start font-semibold hover:underline"
        >
          {t("festival.all")}
        </Link>
        {/* The page's bold moment: the festival and its next date. */}
        <header className="own-toran bg-night text-on-night rise relative overflow-hidden rounded-[2rem]">
          <Toran night />
          <div
            aria-hidden="true"
            className="rangoli-art rangoli-art-night pointer-events-none absolute -top-16 -right-24 size-[22rem] opacity-10 sm:size-[30rem] sm:opacity-20"
          />
          <div className="relative flex flex-wrap items-end gap-x-8 gap-y-5 px-5 pt-2 pb-8 sm:px-12 sm:pb-12">
            {next && (
              <DateTile
                date={next.starts_on}
                label={formatDateRange(next.starts_on, next.ends_on)}
                size="lg"
                night
              />
            )}
            <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-3">
              <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
                {festival.name}
              </h1>
              {festival.summary && (
                <p className="text-night-muted max-w-prose text-lg sm:text-xl">
                  {festival.summary}
                </p>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="flex flex-wrap items-start gap-x-16 gap-y-12">
        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-6 lg:sticky lg:top-28 lg:order-2">
          <div className={`${cardClass} flex flex-col gap-5 p-6 sm:p-7`}>
            {festival.dates.length ? (
              <ul className="flex flex-col gap-3">
                {festival.dates.map((d) => (
                  <li key={d.id} className="flex flex-col items-start gap-1">
                    <span className="text-lg font-semibold">
                      {formatDateRange(d.starts_on, d.ends_on)}
                    </span>
                    {calendarLabel(d.calendar) && (
                      <span className="text-muted">
                        {calendarLabel(d.calendar)}
                      </span>
                    )}
                    {!d.verified && (
                      <Badge tone="marigold">
                        {t("festival.dateNotChecked")}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("festival.noDate")}</p>
            )}
            <ShareButtons
              label={t("festival.share")}
              text={t("festival.shareText", { name: festival.name })}
              path={localePath(`/festivals/${festival.slug}`)}
            />
          </div>
          {season && (
            <Link
              href={localePath(`/${season.slug}`)}
              className="bg-sunk text-ink hover:bg-tile flex items-center justify-between gap-3 rounded-3xl px-6 py-5 font-semibold no-underline transition-colors"
            >
              <span>
                {t("season.allOf", { period: seasonText(season).period })}
              </span>
              <span aria-hidden="true" className="text-peacock">
                →
              </span>
            </Link>
          )}
        </aside>

        <section
          aria-labelledby="events"
          className="flex min-w-0 flex-[999_1_34rem] flex-col gap-4"
        >
          <h2
            id="events"
            className="font-display text-4xl leading-tight sm:text-5xl"
          >
            {t("festival.atMandirs", { name: festival.name })}
          </h2>
          {during.length ? (
            <EventList events={nearTo(during, null, 0)} />
          ) : (
            <div className="bg-sunk rounded-3xl p-6">
              <p className="font-semibold">
                {t("festival.noEvents", { name: festival.name })}
              </p>
              <p className="text-muted">
                {t("festival.appearBefore")}{" "}
                <Link
                  href={localePath("/whats-on")}
                  className="text-peacock underline"
                >
                  {t("festival.whatsOnLink")}
                </Link>{" "}
                {t("festival.orFind")}{" "}
                <Link
                  href={localePath("/mandirs")}
                  className="text-peacock underline"
                >
                  {t("festival.nearestMandir")}
                </Link>
                {t("festival.appearAfter")}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
