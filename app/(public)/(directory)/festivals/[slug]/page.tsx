import { seasonOf } from "@/lib/seasons";
import type { Metadata } from "next";
import Link from "next/link";
import { Ornament } from "@/components/ui";
import { notFound } from "next/navigation";
import { EventList } from "@/components/event-list";
import { Badge, LoadProblem } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { getFestival, listFestivals } from "@/lib/directory";
import { mentionsFestival } from "@/lib/festival-words";
import { calendarLabel, formatDateRange, londonDate } from "@/lib/format";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, pageTitle, siteUrl } from "@/lib/site";
import { breadcrumbData } from "@/lib/structured-data";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";
import { festivalText, localePath, pageT } from "@/lib/i18n/page";

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

  return (
    <>
      <JsonLd
        data={breadcrumbData([
          { name: "Toran", url: `${siteUrl()}/` },
          { name: t("shell.festivals"), url: `${siteUrl()}/festivals` },
          { name: festival.name, url: `${siteUrl()}/festivals/${slug}` },
        ])}
      />
      <Link
        href={localePath("/festivals")}
        className="text-peacock self-start font-semibold hover:underline"
      >
        {t("festival.all")}
      </Link>
      <div className="rise flex flex-col gap-2 sm:gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {festival.name}
        </h1>
        <Ornament />
        {festival.summary && (
          <p className="text-muted max-w-prose text-base sm:text-lg">
            {festival.summary}
          </p>
        )}
        {festival.dates.length ? (
          <ul className="flex flex-col gap-1">
            {festival.dates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <span className="text-marigold-ink text-lg font-bold sm:text-xl">
                  {formatDateRange(d.starts_on, d.ends_on)}
                </span>
                {calendarLabel(d.calendar) && (
                  <span className="text-muted">
                    · {calendarLabel(d.calendar)}
                  </span>
                )}
                {!d.verified && (
                  <Badge tone="marigold">{t("festival.dateNotChecked")}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t("festival.noDate")}</p>
        )}
        <div className="pt-1">
          <ShareButtons
            label={t("festival.share")}
            text={t("festival.shareText", { name: festival.name })}
            path={localePath(`/festivals/${festival.slug}`)}
          />
        </div>
      </div>

      {season && (
        <Link
          href={`/${season.slug}`}
          className="border-marigold/50 bg-marigold/10 lift text-ink flex items-center justify-between gap-3 rounded-2xl border p-4 font-semibold no-underline"
        >
          <span>All of {season.period} at mandirs, in one place</span>
          <span aria-hidden="true" className="text-peacock">
            →
          </span>
        </Link>
      )}

      <section aria-labelledby="events" className="flex flex-col gap-4">
        <h2 id="events" className="font-display text-2xl font-bold sm:text-3xl">
          {t("festival.atMandirs", { name: festival.name })}
        </h2>
        {during.length ? (
          <EventList events={nearTo(during, null, 0)} />
        ) : (
          <div className="bg-sunk rounded-2xl p-5">
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
    </>
  );
}
