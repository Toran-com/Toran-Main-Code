import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { type CSSProperties, Suspense } from "react";
import { POSTCODE_CREDIT } from "@/components/event-list";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { SevaExplorer } from "@/components/seva-explorer";
import { buttonClass, inputClass, Loading, Notice } from "@/components/ui";
import { dateTileParts, formatEventStart } from "@/lib/format";
import { localePath, pageT } from "@/lib/i18n/page";
import { londonDate } from "@/lib/london";
import { shiftLabel } from "@/lib/seva";
import {
  type FinderNeed,
  PARTS_OF_DAY,
  type PartOfDay,
  partOfDay,
  ROLE_KINDS,
  type RoleKind,
  roleKind,
} from "@/lib/seva-finder";
import {
  listSevaRotas,
  type SevaNeed,
  sevaNeeds,
  sevaTotals,
} from "@/lib/seva-needs";
import { sevaPath } from "@/lib/share";
import { pageMetadata } from "@/lib/site";
import { positionForSearch } from "@/lib/whats-on";
import {
  dayFrom,
  dayHeading,
  longDayHeading,
  radiusFrom,
} from "@/lib/whats-on-view";

// Seva across mandirs: how much help is being asked for, then every event
// whose committee is asking for volunteers on Toran and still needs
// people, to narrow by place, kind of seva, day and time of day, and a slot
// taken in a tap with no name asked (decision 0013). The narrowing happens
// in the browser (components/seva-explorer.tsx).

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
  const now = new Date();
  const near = String(query.near ?? "")
    .trim()
    .slice(0, 10);
  const within = radiusFrom(query.within);

  const [rotas, origin] = await Promise.all([
    listSevaRotas(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  let problem: string | null = null;
  let position = null;
  if (near && origin === "unavailable") {
    problem = t("whatsOn.lookupFailed");
  } else if (near && !origin) {
    problem = t("whatsOn.notFound", { place: near });
  } else if (origin && origin !== "unavailable") {
    position = origin;
  }

  const rows = rotas.state === "ok" ? rotas.data : [];
  const needs = finderNeeds(sevaNeeds(rows, now));
  const totals = sevaTotals(rows, now);
  const days = [...new Set(needs.flatMap((n) => n.shifts.map((s) => s.day)))]
    .sort()
    .map((day) => {
      const heading = dayHeading(`${day}T12:00:00Z`, now);
      return {
        day,
        heading,
        label:
          heading === longDayHeading(day)
            ? formatEventStart(`${day}T12:00:00Z`, true)
            : heading,
      };
    });
  const kind = String(query.kind ?? "");
  const part = String(query.time ?? "");
  const day = dayFrom(query.day);

  return (
    <>
      {totals.places > 0 && <NeedBand totals={totals} />}
      {problem && <Notice tone="error">{problem}</Notice>}
      {rotas.state !== "ok" ? (
        <LoadProblem state={rotas.state} what={t("load.sevaRota")} />
      ) : needs.length ? (
        <SevaExplorer
          key={position ? near : "anywhere"}
          needs={needs}
          days={days}
          today={londonDate(now)}
          tomorrow={londonDate(new Date(now.getTime() + 86_400_000))}
          origin={position ? { ...position, place: near.toUpperCase() } : null}
          within={within}
          initial={{
            kind: (ROLE_KINDS as readonly string[]).includes(kind)
              ? (kind as RoleKind)
              : "",
            day: days.some((d) => d.day === day) ? day : "",
            part: (PARTS_OF_DAY as readonly string[]).includes(part)
              ? (part as PartOfDay)
              : "",
            view: query.view === "map" ? "map" : "list",
            all: query.all === "1",
          }}
          postcode={<PostcodeForm near={near} within={within} />}
        />
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">{t("sevaList.none")}</p>
        </div>
      )}
      {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}

      <details className="group border-line border-t pt-4">
        <summary className="text-peacock w-fit cursor-pointer text-lg font-semibold">
          {t("sevaList.howTitle")}
        </summary>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-6">
          <li>{t("sevaList.how1")}</li>
          <li>{t("sevaList.how2")}</li>
          <li>{t("sevaList.how3")}</li>
        </ol>
      </details>
      <p className="text-muted">
        {t("sevaList.committee")}{" "}
        <Link href="/for-mandirs" className="text-peacock font-semibold">
          {t("sevaList.committeeLink")}
        </Link>
      </p>
    </>
  );
}

// How much help is being asked for, counting up as the page opens.
function NeedBand({
  totals,
}: {
  totals: { places: number; mandirs: number; taken: number };
}) {
  const t = pageT();
  return (
    <section
      aria-label={t("sevaList.title")}
      className="bg-night text-on-night rise relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-10 sm:py-9"
    >
      <div
        aria-hidden="true"
        className="rangoli-art rangoli-art-night pointer-events-none absolute -top-16 -right-24 size-[20rem] opacity-20 sm:size-[26rem]"
      />
      <div className="relative flex flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span
            aria-hidden="true"
            className="count-up font-display text-night-accent text-7xl leading-none sm:text-8xl"
            style={{ "--to": totals.places } as CSSProperties}
          />
          <span className="sr-only">{totals.places}</span>
          <span className="text-2xl font-bold sm:text-3xl">
            {t.count("sevaList.places", totals.places)}
          </span>
        </p>
        <p className="text-xl">
          {t.count("sevaList.atMandirs", totals.mandirs)}
        </p>
        {totals.taken > 0 && (
          <p className="text-on-night/80 mt-2 text-lg">
            <span aria-hidden="true">🙏 </span>
            {t.count("sevaList.taken", totals.taken)}
          </p>
        )}
      </div>
    </section>
  );
}

// "Or type a postcode": works without JavaScript too.
function PostcodeForm({ near, within }: { near: string; within: number }) {
  const t = pageT();
  return (
    <form className="flex flex-col gap-2">
      <label htmlFor="near" className="font-semibold">
        {t("sevaList.postcode")}
      </label>
      <div className="flex gap-2">
        <input
          id="near"
          name="near"
          defaultValue={near}
          placeholder={t("whatsOn.nearExample")}
          autoComplete="postal-code"
          className={`${inputClass} min-w-0 flex-[2]`}
        />
        {within !== 15 && <input type="hidden" name="within" value={within} />}
        <button
          type="submit"
          className={`${buttonClass} flex-1 basis-24 sm:max-w-40`}
        >
          {t("whatsOn.show")}
        </button>
      </div>
    </form>
  );
}

// The events as the finder wants them, with their words worked out here in
// the page's language.
function finderNeeds(needs: SevaNeed[]): FinderNeed[] {
  return needs.map((need) => ({
    id: need.event.id,
    title: need.event.title,
    titleGu: need.event.title_gu,
    slug: need.mandir.slug,
    mandir: need.mandir.name,
    town: need.mandir.town,
    place: [need.mandir.name, need.mandir.town].join(", "),
    latitude: need.mandir.latitude,
    longitude: need.mandir.longitude,
    path: localePath(sevaPath(need.mandir.slug, need.event.id)),
    tile: dateTileParts(need.next_starts_at),
    dateLabel: formatEventStart(need.next_starts_at, true),
    shifts: need.shifts.map((s) => {
      const label = shiftLabel(s.startsAt, s.endsAt);
      return {
        ...s,
        kind: roleKind(s.role),
        label,
        time: label.split(", ").at(-1) ?? label,
        day: londonDate(new Date(s.startsAt)),
        part: partOfDay(s.startsAt),
      };
    }),
  }));
}
