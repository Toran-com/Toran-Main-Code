import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { type ReactNode, Suspense } from "react";
import { EventList } from "@/components/event-list";
import { PageHeading } from "@/components/public-shell";
import { buttonClass, inputClass, Loading } from "@/components/ui";
import { listFestivalDates, listMandirs } from "@/lib/directory";
import { EVENT_KINDS, kindLabel } from "@/lib/event-kinds";
import { formatDateRange } from "@/lib/format";
import { festivalText, localePath, pageT } from "@/lib/i18n/page";
import { parseQuery, search } from "@/lib/search";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents } from "@/lib/whats-on";
import { nearTo } from "@/lib/whats-on-view";

// One box to find anything on Toran: events coming up, mandirs and
// towns, and festivals (lib/search.ts). Works without JavaScript.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return {
    ...pageMetadata(
      t("search.title"),
      t("search.description"),
      localePath("/search"),
    ),
    // Results pages aren't for search engines.
    robots: { index: false, follow: true },
  };
}

export default function SearchPage(props: PageProps<"/search">) {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-8 sm:gap-10">
      <PageHeading title={t("search.title")} />
      <Suspense fallback={<Loading />}>
        <Results {...props} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: PageProps<"/search">) {
  const t = pageT();
  const text = String((await searchParams).q ?? "").slice(0, 100);
  // "Today" and "Tomorrow" in the results are worked out per visit.
  await connection();
  const query = parseQuery(text);

  const box = (
    <form
      role="search"
      action={localePath("/search")}
      className="flex flex-col gap-2"
    >
      <label htmlFor="q" className="font-semibold">
        {t("search.label")}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={text}
          placeholder={t("search.example")}
          enterKeyHint="search"
          className={`${inputClass} min-w-0 flex-[3_1_14rem]`}
        />
        <button
          type="submit"
          className={`${buttonClass} flex-[1_1_8rem] sm:w-auto`}
        >
          {t("search.button")}
        </button>
      </div>
    </form>
  );
  if (!query) return box;

  const [events, mandirs, dates] = await Promise.all([
    listUpcomingEvents(),
    listMandirs(),
    listFestivalDates(),
  ]);
  // Each festival once, with its next date.
  const festivals = new Map<
    string,
    { slug: string; name: string; when: string }
  >();
  for (const d of dates.state === "ok" ? dates.data : []) {
    if (!d.festival || festivals.has(d.festival.slug)) continue;
    festivals.set(d.festival.slug, {
      slug: d.festival.slug,
      name: festivalText(d.festival.slug, d.festival).name,
      when: formatDateRange(d.starts_on, d.ends_on),
    });
  }
  const found = search(
    {
      events:
        events.state === "ok"
          ? events.data.filter((e) => e.status === "published")
          : [],
      mandirs: mandirs.state === "ok" ? mandirs.data : [],
      festivals: [...festivals.values()],
    },
    query,
    (kind) =>
      kindLabel(kind) ?? EVENT_KINDS[kind as keyof typeof EVENT_KINDS] ?? "",
  );

  return (
    <>
      {box}
      <p className="text-muted" aria-live="polite">
        {found.total
          ? t.count("search.count", found.total)
          : t("search.none", { q: text })}
      </p>

      {found.festivals.count > 0 && (
        <Section
          id="found-festivals"
          title={t("shell.festivals")}
          count={found.festivals.count}
        >
          <ul className="divide-line border-line flex flex-col divide-y border-y">
            {found.festivals.shown.map((f) => (
              <li
                key={f.slug}
                className="flex flex-wrap justify-between gap-x-4 py-3"
              >
                <Link
                  href={localePath(`/festivals/${f.slug}`)}
                  className="text-peacock font-semibold underline"
                >
                  {f.name}
                </Link>
                <span className="text-muted">{f.when}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {found.mandirs.count > 0 && (
        <Section
          id="found-mandirs"
          title={t("shell.mandirs")}
          count={found.mandirs.count}
        >
          <ul className="divide-line border-line flex flex-col divide-y border-y">
            {found.mandirs.shown.map((m) => (
              <li
                key={m.slug}
                className="flex flex-wrap justify-between gap-x-4 py-3"
              >
                <Link
                  href={localePath(`/mandirs/${m.slug}`)}
                  className="text-peacock font-semibold underline"
                >
                  {m.name}
                </Link>
                <span className="text-muted">{m.town}</span>
              </li>
            ))}
          </ul>
          {found.mandirs.count > found.mandirs.shown.length && (
            <Link
              href={localePath("/mandirs")}
              className="text-peacock font-semibold"
            >
              {t("search.allMandirs")} →
            </Link>
          )}
        </Section>
      )}

      {found.events.count > 0 && (
        <Section
          id="found-events"
          title={t("search.events")}
          count={found.events.count}
        >
          <EventList
            events={nearTo(found.events.shown, null, 0)}
            now={new Date()}
          />
          {found.events.count > found.events.shown.length && (
            <Link
              href={localePath("/whats-on")}
              className="text-peacock font-semibold"
            >
              {t("search.allEvents")} →
            </Link>
          )}
        </Section>
      )}
    </>
  );
}

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-display text-3xl leading-tight">
        {title} <span className="text-muted text-2xl">({count})</span>
      </h2>
      {children}
    </section>
  );
}
