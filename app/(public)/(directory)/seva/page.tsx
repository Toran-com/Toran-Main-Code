import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AreaChips, regionName } from "@/components/area-chips";
import { POSTCODE_CREDIT } from "@/components/event-list";
import { NearMe } from "@/components/near-me";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { SevaCard } from "@/components/seva-card";
import {
  buttonClass,
  Card,
  inputClass,
  Loading,
  Notice,
} from "@/components/ui";
import { distanceMiles } from "@/lib/geo";
import { localePath, pageT } from "@/lib/i18n/page";
import { listSevaRotas, type SevaNeed, sevaNeeds } from "@/lib/seva-needs";
import { pageMetadata } from "@/lib/site";
import { positionForSearch } from "@/lib/whats-on";
import {
  groupByDay,
  RADII,
  radiusFrom,
  regionCounts,
} from "@/lib/whats-on-view";

// Seva across mandirs: every event whose committee is asking for
// volunteers on Toran and still needs people, soonest first, near you if
// you like. Each leads to the event's rota, where a slot is taken in a tap
// with no name asked (decision 0013).

export async function generateMetadata(): Promise<Metadata> {
  const t = pageT();
  return pageMetadata(
    t("sevaList.title"),
    t("sevaList.description"),
    localePath("/seva"),
  );
}

export default function SevaPage(props: PageProps<"/seva">) {
  const t = pageT();
  return (
    <>
      <PageHeading title={t("sevaList.title")} intro={t("sevaList.intro")} />
      <Suspense fallback={<Loading />}>
        <SevaNeeds {...props} />
      </Suspense>
    </>
  );
}

async function SevaNeeds({ searchParams }: PageProps<"/seva">) {
  const t = pageT();
  const query = await searchParams;
  // Places change as volunteers take slots, and shifts end, so this is
  // worked out per visit.
  await connection();
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);
  const region = String(query.region ?? "").slice(0, 80);

  const [rotas, origin] = await Promise.all([
    listSevaRotas(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  const here = (change: { region?: string }) => {
    const params = new URLSearchParams();
    if (near) params.set("near", near);
    if (within !== 15) params.set("within", String(within));
    const r = change.region ?? region;
    if (r) params.set("region", r);
    const q = params.toString();
    return `${localePath("/seva")}${q ? `?${q}` : ""}#needed`;
  };

  let problem: string | null = null;
  let position = null;
  if (near && origin === "unavailable") {
    problem = t("whatsOn.lookupFailed");
  } else if (near && !origin) {
    problem = t("whatsOn.notFound", { place: near });
  } else if (origin && origin !== "unavailable") {
    position = origin;
  }

  const all = rotas.state === "ok" ? sevaNeeds(rotas.data, new Date()) : [];
  const withMiles = all.flatMap(
    (need): { need: SevaNeed; miles: number | null }[] => {
      const { latitude, longitude } = need.mandir;
      if (!position) return [{ need, miles: null }];
      if (latitude === null || longitude === null) return [];
      const miles = distanceMiles(position, { latitude, longitude });
      return miles <= within ? [{ need, miles }] : [];
    },
  );
  const shown = withMiles.filter(
    ({ need }) => !region || need.mandir.region === region,
  );
  const areas = position ? [] : regionCounts(all);
  const byDay = groupByDay(
    shown.map((x) => ({ ...x, next_starts_at: x.need.next_starts_at })),
    new Date(),
  ).map((day) => ({
    ...day,
    // Near a place: each day's nearest first.
    events: position
      ? [...day.events].sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0))
      : day.events,
  }));

  return (
    <>
      <form className="border-line bg-surface shadow-card flex flex-col gap-4 rounded-3xl border p-5 sm:p-6">
        <NearMe
          page={localePath("/seva")}
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
        {region && <input type="hidden" name="region" value={region} />}
      </form>

      {problem && <Notice tone="error">{problem}</Notice>}
      {rotas.state !== "ok" ? (
        <LoadProblem state={rotas.state} what={t("load.sevaRota")} />
      ) : shown.length ? (
        <section aria-labelledby="needed" className="flex flex-col gap-4">
          <p id="needed" className="text-muted scroll-mt-24" aria-live="polite">
            {t.count("sevaList.count", shown.length)}
            {position &&
              t("whatsOn.countNear", {
                miles: within,
                place: near.toUpperCase(),
              })}
            {region && t("whatsOn.countRegion", { region: regionName(region) })}
          </p>
          <AreaChips
            areas={areas}
            total={all.length}
            chosen={region}
            href={(r) => here({ region: r })}
          />
          <div className="flex flex-col gap-8 sm:gap-10">
            {byDay.map(({ day, heading, events }) => (
              <section key={day} className="flex flex-col">
                <h2 className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
                  {heading}
                </h2>
                <ul className="divide-line flex flex-col divide-y">
                  {events.map(({ need, miles }) => (
                    <li key={need.event.id}>
                      <SevaCard need={need} miles={miles} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">
            {position || region ? t("sevaList.noneNear") : t("sevaList.none")}
          </p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}

      <Card>
        <h2 className="text-xl font-bold sm:text-2xl">
          {t("sevaList.howTitle")}
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-6">
          <li>{t("sevaList.how1")}</li>
          <li>{t("sevaList.how2")}</li>
          <li>{t("sevaList.how3")}</li>
        </ol>
      </Card>
      <p className="text-muted">
        {t("sevaList.committee")}{" "}
        <Link href="/for-mandirs" className="text-peacock font-semibold">
          {t("sevaList.committeeLink")}
        </Link>
      </p>
    </>
  );
}
