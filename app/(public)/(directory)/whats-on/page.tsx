import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { EVENT_KINDS, isEventKind } from "@/lib/event-kinds";
import { REGIONS } from "@/lib/mandir-form";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import { nearTo, RADII, radiusFrom } from "@/lib/whats-on-view";
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

  const form = (
    <form className="border-line bg-surface shadow-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-2 sm:items-end lg:grid-cols-[2fr_1fr_1.5fr_1.5fr_auto]">
      <label className="flex flex-col gap-2">
        <span className="font-semibold">{t("whatsOn.near")}</span>
        <input
          name="near"
          defaultValue={near}
          placeholder={t("whatsOn.nearExample")}
          autoComplete="postal-code"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">{t("whatsOn.within")}</span>
        <select
          name="within"
          defaultValue={String(within)}
          className={inputClass}
        >
          {RADII.map((r) => (
            <option key={r} value={r}>
              {t("whatsOn.miles", { miles: r })}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">{t("whatsOn.region")}</span>
        <select name="region" defaultValue={region} className={inputClass}>
          <option value="">{t("whatsOn.anywhere")}</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">{t("whatsOn.type")}</span>
        <select name="type" defaultValue={kind} className={inputClass}>
          <option value="">{t("whatsOn.anyType")}</option>
          {Object.entries(EVENT_KINDS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={`${buttonClass} sm:w-auto`}>
        {t("whatsOn.show")}
      </button>
    </form>
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
  const events = nearTo(chosen, position, within);

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
