import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { NearMe } from "@/components/near-me";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { EVENT_KINDS, isEventKind } from "@/lib/event-kinds";
import { REGIONS } from "@/lib/mandir-form";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import {
  nearestFirstEachDay,
  nearTo,
  RADII,
  radiusFrom,
} from "@/lib/whats-on-view";
import { translator } from "@/lib/i18n";

export const metadata: Metadata = pageMetadata(
  "What's on",
  "Events at Hindu mandirs across the UK in the next eight weeks: festivals, aarti, bhajans, classes and more.",
  "/whats-on",
);

export default function WhatsOnPage(props: PageProps<"/whats-on">) {
  const t = translator();
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
  const t = translator();
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

  const [result, origin] = await Promise.all([
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  // Links for the type-of-event chips keep the other choices.
  const typeHref = (value: string) => {
    const params = new URLSearchParams();
    if (near) params.set("near", near);
    if (within !== 15) params.set("within", String(within));
    if (region) params.set("region", region);
    if (value) params.set("type", value);
    const q = params.toString();
    return q ? `/whats-on?${q}` : "/whats-on";
  };

  const form = (
    <div className="flex flex-col gap-3">
      <form className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-2xl border p-4 sm:p-5">
        <NearMe
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
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </details>
        {kind && <input type="hidden" name="type" value={kind} />}
      </form>
      <nav
        aria-label={t("whatsOn.type")}
        className="-mx-4 px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {[["", t("whatsOn.anyType")] as const, ...Object.entries(EVENT_KINDS)]
            .filter(([value]) => value !== "other")
            .map(([value, label]) => {
              const here = value === kind;
              return (
                <li key={value || "any"} className="shrink-0">
                  <Link
                    href={typeHref(value)}
                    aria-current={here ? "page" : undefined}
                    className={`inline-block rounded-full border px-4 py-1.5 text-base font-semibold whitespace-nowrap no-underline transition-colors ${
                      here
                        ? "border-peacock bg-peacock text-on-peacock"
                        : "border-line bg-surface hover:border-peacock/50"
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
        <LoadProblem state={result.state} what="event list" />
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

  const chosen = result.data.filter(
    (e) =>
      (!region || e.mandir.region === region) && (!kind || e.kind === kind),
  );
  // Near a place: each day's events nearest first.
  const nearby = nearTo(chosen, position, within);
  const events = position ? nearestFirstEachDay(nearby) : nearby;

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
            {region && t("whatsOn.countRegion", { region })}
            {kind && t("whatsOn.countType", { type: EVENT_KINDS[kind] })}
            {position && t("whatsOn.nearestFirst")}
          </p>
          <EventList events={events} now={new Date()} />
        </>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-2xl p-5">
          <p className="font-semibold">
            {position || region || kind
              ? t("whatsOn.noneThere")
              : t("whatsOn.noneYet")}
          </p>
          <p className="text-muted">
            {t("whatsOn.emptyBefore")}
            <Link href="/mandirs" className="text-peacock underline">
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
