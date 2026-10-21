import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { NearMe } from "@/components/near-me";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { EVENT_KINDS, isEventKind, kindLabel } from "@/lib/event-kinds";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { REGIONS } from "@/lib/mandir-form";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import {
  dayFrom,
  LONG_LIST,
  longDayHeading,
  nearestFirstEachDay,
  nearTo,
  onDay,
  PER_DAY,
  RADII,
  radiusFrom,
} from "@/lib/whats-on-view";
import { pageT, localePath } from "@/lib/i18n/page";

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("whatsOn.title"),
    t("whatsOn.description"),
    localePath("/whats-on"),
  );
}

export default function WhatsOnPage(props: PageProps<"/whats-on">) {
  const t = pageT();
  return (
    <>
      <PageHeading title={t("whatsOn.title")} intro={t("whatsOn.intro")} />
      <Suspense fallback={<Loading />}>
        <WhatsOn {...props} />
      </Suspense>
    </>
  );
}

async function WhatsOn({ searchParams }: PageProps<"/whats-on">) {
  const t = pageT();
  const query = await searchParams;
  // The list says "Today" and "Tomorrow", so it's worked out per visit,
  // never ahead of time (for example when a link to it is prefetched).
  await connection();
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);
  const region = String(query.region ?? "");
  const type = String(query.type ?? "");
  const kind = isEventKind(type) ? type : "";
  const day = dayFrom(query.day);

  const [result, origin] = await Promise.all([
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  // Links that change one choice and keep the others.
  const here = (change: { type?: string; day?: string }) => {
    const params = new URLSearchParams();
    if (near) params.set("near", near);
    if (within !== 15) params.set("within", String(within));
    if (region) params.set("region", region);
    const k = change.type ?? kind;
    const d = change.day ?? day;
    if (k) params.set("type", k);
    if (d) params.set("day", d);
    const q = params.toString();
    return q ? `${localePath("/whats-on")}?${q}` : localePath("/whats-on");
  };
  const typeHref = (value: string) => here({ type: value });

  const form = (
    <div className="flex flex-col gap-4">
      <form className="border-line bg-surface shadow-card flex flex-col gap-4 rounded-3xl border p-5 sm:p-6">
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
            <input
              id="near"
              name="near"
              defaultValue={near}
              placeholder={t("whatsOn.nearExample")}
              autoComplete="postal-code"
              className={inputClass}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="font-semibold">{t("whatsOn.within")}</span>
            <select
              name="within"
              defaultValue={String(within)}
              className={`${inputClass} w-auto py-2`}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {t("whatsOn.miles", { miles: r })}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className={`${buttonClass} flex-1 basis-32 py-2 sm:max-w-48`}
          >
            {t("whatsOn.show")}
          </button>
        </div>
        <details className="group" open={!!region}>
          <summary className="text-peacock w-fit cursor-pointer font-semibold">
            {t("whatsOn.moreOptions")}
          </summary>
          <label className="mt-3 flex flex-col gap-2">
            <span className="font-semibold">{t("whatsOn.region")}</span>
            <select name="region" defaultValue={region} className={inputClass}>
              <option value="">{t("whatsOn.anywhere")}</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {t(regionKey(r)!)}
                </option>
              ))}
            </select>
          </label>
        </details>
        {kind && <input type="hidden" name="type" value={kind} />}
        {day && <input type="hidden" name="day" value={day} />}
      </form>
      <nav
        aria-label={t("whatsOn.type")}
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {[["", t("whatsOn.anyType")] as const, ...Object.entries(EVENT_KINDS)]
            .filter(([value]) => value !== "other")
            .map(([value, english]) => {
              const label = value ? (kindLabel(value) ?? english) : english;
              const here = value === kind;
              return (
                <li key={value || "any"} className="shrink-0">
                  <Link
                    href={typeHref(value)}
                    aria-current={here ? "page" : undefined}
                    className={`inline-block rounded-full border px-4 py-2 text-base whitespace-nowrap no-underline transition-colors ${
                      here
                        ? "border-ink bg-ink text-bg font-semibold"
                        : "border-line-strong bg-surface text-ink hover:border-peacock/60 font-medium"
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );

  if (result.state !== "ok") {
    return (
      <>
        {form}
        <LoadProblem state={result.state} what={t("load.eventList")} />
      </>
    );
  }

  let problem: string | null = null;
  let position = null;
  if (near && origin === "unavailable") {
    problem = t("whatsOn.lookupFailed");
  } else if (near && !origin) {
    problem = t("whatsOn.notFound", { place: near });
  } else if (origin && origin !== "unavailable") {
    position = origin;
  }

  const chosen = onDay(
    result.data.filter(
      (e) =>
        (!region || e.mandir.region === region) && (!kind || e.kind === kind),
    ),
    day,
  );
  // Near a place: each day's events nearest first.
  const nearby = nearTo(chosen, position, within);
  const events = position ? nearestFirstEachDay(nearby) : nearby;
  const long =
    !position && !region && !kind && !day && events.length > LONG_LIST;

  return (
    <>
      {form}
      {problem && <Notice tone="error">{problem}</Notice>}
      {events.length ? (
        <>
          <p className="text-muted" aria-live="polite">
            {t.count("whatsOn.count", events.length)}
            {position &&
              t("whatsOn.countNear", {
                miles: within,
                place: near.toUpperCase(),
              })}
            {region &&
              t("whatsOn.countRegion", {
                region: regionKey(region) ? t(regionKey(region)!) : region,
              })}
            {kind &&
              t("whatsOn.countType", {
                type: kindLabel(kind) ?? EVENT_KINDS[kind],
              })}
            {day && t("whatsOn.onDay", { day: longDayHeading(day) })}
            {position && t("whatsOn.nearestFirst")}
            {day && (
              <>
                {" · "}
                <Link
                  href={here({ day: "" })}
                  className="text-peacock underline"
                >
                  {t("whatsOn.everyDay")}
                </Link>
              </>
            )}
          </p>
          <EventList
            events={events}
            now={new Date()}
            more={
              long
                ? { perDay: PER_DAY, href: (d) => here({ day: d }) }
                : undefined
            }
          />
        </>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">
            {position || region || kind || day
              ? t("whatsOn.noneThere")
              : t("whatsOn.noneYet")}
          </p>
          <p className="text-muted">
            {t("whatsOn.emptyBefore")}
            <Link
              href={localePath("/mandirs")}
              className="text-peacock underline"
            >
              {t("whatsOn.emptyLink")}
            </Link>
            {t("whatsOn.emptyAfter")}
          </p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}
    </>
  );
}
