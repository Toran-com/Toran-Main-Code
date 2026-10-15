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
import { pageMetadata, pageTitle } from "@/lib/site";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";
import { translator } from "@/lib/i18n";

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
  const { name, dates } = result.data;
  const year = dates[0]?.starts_on.slice(0, 4);
  return pageMetadata(
    `${name}${year ? ` ${year}` : ""} in the UK`,
    `${name} dates for the UK and events at mandirs near you.`,
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
  if (result.state === "unavailable") {
    return <LoadProblem state="unavailable" what="festival page" />;
  }
  if (!result.data) notFound();
  const festival = result.data;
  const t = translator();

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
      <Link
        href="/festivals"
        className="text-peacock self-start font-semibold hover:underline"
      >
        {t("festival.all")}
      </Link>
      <div className="rise flex flex-col gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {festival.name}
        </h1>
        <Ornament />
        {festival.summary && (
          <p className="text-muted max-w-prose text-lg">{festival.summary}</p>
        )}
        <ShareButtons
          label="Share this festival"
          text={`${festival.name} in the UK: dates and events at mandirs`}
          path={`/festivals/${festival.slug}`}
        />
      </div>

      {festival.dates.length ? (
        <ul className="rise-list flex flex-col gap-2">
          {festival.dates.map((d) => (
            <li
              key={d.id}
              className="border-line bg-surface shadow-card flex flex-wrap items-center gap-2 rounded-2xl border p-4"
            >
              <span className="text-marigold-ink font-semibold">
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

      <section aria-labelledby="events" className="flex flex-col gap-4">
        <h2 id="events" className="font-display text-3xl font-bold">
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
              They appear here as mandirs add them. Check{" "}
              <Link href="/whats-on" className="text-peacock underline">
                what&apos;s on
              </Link>{" "}
              or find your{" "}
              <Link href="/mandirs" className="text-peacock underline">
                nearest mandir
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </>
  );
}
