import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EventCard } from "@/components/event-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading } from "@/components/ui";
import { dateLocale } from "@/lib/format";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { localePath, pageT } from "@/lib/i18n/page";
import { REGIONS } from "@/lib/mandir-form";
import { regularGroups, weekdayName } from "@/lib/regular";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents } from "@/lib/whats-on";

// Classes and regular groups: everything that happens every week,
// fortnight or month (bal vihar, bhajan mandal, yoga, Gujarati class…),
// by the day it's on, with a choice of area.

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("regular.title"),
    t("regular.description"),
    localePath("/regular"),
  );
}

export default function RegularPage(props: PageProps<"/regular">) {
  const t = pageT();
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <PageHeading title={t("regular.title")} intro={t("regular.intro")} />
      <Suspense fallback={<Loading />}>
        <Regular {...props} />
      </Suspense>
    </div>
  );
}

async function Regular({ searchParams }: PageProps<"/regular">) {
  const t = pageT();
  const query = await searchParams;
  const asked = String(query.region ?? "");
  const region = (REGIONS as readonly string[]).includes(asked) ? asked : "";
  const result = await listUpcomingEvents();
  if (result.state !== "ok") {
    return <LoadProblem state={result.state} what={t("regular.what")} />;
  }
  const all = regularGroups(result.data);
  // Only the areas that have something regular.
  const areas = REGIONS.filter((r) =>
    all.some((d) => d.events.some((e) => e.mandir.region === r)),
  );
  const days = all
    .map((d) => ({
      ...d,
      events: region
        ? d.events.filter((e) => e.mandir.region === region)
        : d.events,
    }))
    .filter((d) => d.events.length > 0);
  const label = (r: string) => (regionKey(r) ? t(regionKey(r)!) : r);
  const href = (r: string) =>
    r
      ? `${localePath("/regular")}?region=${encodeURIComponent(r)}`
      : localePath("/regular");

  return (
    <>
      {areas.length > 1 && (
        <nav aria-label={t("regular.areas")}>
          <ul className="flex flex-wrap gap-2">
            {["", ...areas].map((r) => (
              <li key={r || "all"}>
                <Link
                  href={href(r)}
                  aria-current={r === region ? "page" : undefined}
                  className={`inline-block rounded-full border px-4 py-1.5 text-base font-semibold ${
                    r === region
                      ? "border-peacock bg-peacock text-on-peacock"
                      : "border-line hover:bg-sunk"
                  }`}
                >
                  {r ? label(r) : t("regular.everywhere")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {days.length === 0 ? (
        <p className="text-muted text-lg">{t("regular.none")}</p>
      ) : (
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
          {days.map((d) => (
            <section
              key={d.weekday}
              aria-labelledby={`day-${d.weekday}`}
              className="flex flex-col gap-3"
            >
              <h2
                id={`day-${d.weekday}`}
                className="font-display text-3xl leading-tight sm:text-4xl"
              >
                {weekdayName(d.weekday, dateLocale())}
              </h2>
              <div className="divide-line flex flex-col divide-y">
                {d.events.map((e) => (
                  <EventCard key={e.id} event={{ ...e, miles: null }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p>
        <Link
          href={localePath("/whats-on")}
          className="text-peacock font-semibold underline"
        >
          {t("regular.seeAll")}
        </Link>
      </p>
    </>
  );
}
