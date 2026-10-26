import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { EventsMapView } from "@/components/events-map-view";
import { FollowedOnly } from "@/components/follow";
import { PlanLink } from "@/components/plan";
import { PlacePicker } from "@/components/place-picker";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { Loading, Notice, pillButtonClass } from "@/components/ui";
import { EVENT_KINDS, isEventKind, kindLabel } from "@/lib/event-kinds";
import { londonDate } from "@/lib/format";
import { cleanSlugs } from "@/lib/follow";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { REGIONS } from "@/lib/mandir-form";
import { pageMetadata } from "@/lib/site";
import { listUpcomingEvents, positionForSearch } from "@/lib/whats-on";
import {
  datesFor,
  dayFrom,
  LONG_LIST,
  longDayHeading,
  nearestFirstEachDay,
  nearTo,
  onDays,
  PER_DAY,
  pinsFor,
  RADII,
  radiusFrom,
  whenFrom,
  type When,
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
  // "Today" or "This weekend" (a single day, from "more on this day", wins).
  const when = day ? "" : whenFrom(query.when);
  const view = query.view === "map" ? "map" : "list";
  // The mandirs followed on the visitor's phone, when they ask for those.
  const mandirs = cleanSlugs(query.mandirs);

  const [result, origin] = await Promise.all([
    listUpcomingEvents(),
    near ? positionForSearch(near) : Promise.resolve(null),
  ]);

  // Links that change one choice and keep the others.
  const here = (change: {
    type?: string;
    region?: string;
    day?: string;
    when?: When;
    view?: string;
    mandirs?: string;
  }) => {
    const params = new URLSearchParams();
    if (near) params.set("near", near);
    if (within !== 15) params.set("within", String(within));
    const r = change.region ?? region;
    const k = change.type ?? kind;
    // Choosing a day forgets "today" or "this weekend", and the other way.
    const d = change.day ?? (change.when === undefined ? day : "");
    const w = change.when ?? (change.day === undefined ? when : "");
    if (r) params.set("region", r);
    if (k) params.set("type", k);
    if (d) params.set("day", d);
    if (w) params.set("when", w);
    if ((change.view ?? view) === "map") params.set("view", "map");
    const m = change.mandirs ?? mandirs.join(",");
    if (m) params.set("mandirs", m);
    const q = params.toString().replace(/%2C/g, ",");
    return q ? `${localePath("/whats-on")}?${q}` : localePath("/whats-on");
  };

  const keep = new URLSearchParams();
  if (kind) keep.set("type", kind);
  if (day) keep.set("day", day);
  if (when) keep.set("when", when);
  if (view === "map") keep.set("view", "map");
  if (mandirs.length) keep.set("mandirs", mandirs.join(","));
  const place = (
    <PlacePicker
      page={localePath("/whats-on")}
      near={near}
      within={within}
      radii={RADII}
      status={
        !near
          ? "none"
          : origin === "unavailable"
            ? "unavailable"
            : origin
              ? "found"
              : "unknown"
      }
      region={region}
      keep={keep.toString()}
      pick={query.pick === "1"}
      ask
    />
  );

  if (result.state !== "ok") {
    return (
      <>
        {place}
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

  const chosen = onDays(
    result.data.filter(
      (e) =>
        (!region || e.mandir.region === region) &&
        (!kind || e.kind === kind) &&
        (!mandirs.length || mandirs.includes(e.mandir.slug)),
    ),
    day ? [day] : datesFor(when, londonDate()),
  );
  // Near a place: each day's events nearest first.
  const nearby = nearTo(chosen, position, within);
  const events = position ? nearestFirstEachDay(nearby) : nearby;
  const long =
    !position &&
    !region &&
    !kind &&
    !day &&
    !when &&
    !mandirs.length &&
    events.length > LONG_LIST;

  // What narrows the list, each with a way to take it off.
  const active = [
    kind && {
      label: kindLabel(kind) ?? EVENT_KINDS[kind],
      href: here({ type: "" }),
    },
    region && {
      label: regionKey(region) ? t(regionKey(region)!) : region,
      href: here({ region: "" }),
    },
    day && { label: longDayHeading(day), href: here({ day: "" }) },
    mandirs.length > 0 && {
      label: t("whatsOn.followed"),
      href: here({ mandirs: "" }),
    },
  ].filter((f): f is { label: string; href: string } => !!f);

  return (
    <>
      <div className="flex flex-col gap-3">
        {place}
        <div className="flex items-center justify-between gap-3">
          <nav
            aria-label={t("whatsOn.showAs")}
            className="border-line-strong bg-surface flex rounded-full border p-1"
          >
            {(["list", "map"] as const).map((v) => (
              <Link
                key={v}
                href={here({ view: v })}
                aria-current={view === v ? "page" : undefined}
                className={`rounded-full px-4 py-1 text-base font-semibold no-underline ${
                  view === v ? "bg-ink text-bg" : "text-ink hover:bg-sunk"
                }`}
              >
                {v === "list" ? t("whatsOn.list") : t("whatsOn.map")}
              </Link>
            ))}
          </nav>
          <Filters
            key={`${kind}|${region}`}
            kind={kind}
            region={region}
            count={(kind ? 1 : 0) + (region ? 1 : 0)}
            here={here}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label={t("whatsOn.when")} className="flex gap-2">
            {(["today", "weekend"] as const).map((w) => (
              <Link
                key={w}
                href={here({ when: when === w ? "" : w })}
                aria-current={when === w ? "page" : undefined}
                className={`inline-flex rounded-full border px-4 py-1.5 text-base no-underline ${
                  when === w
                    ? "border-ink bg-ink text-bg font-semibold"
                    : "border-line-strong bg-surface text-ink hover:border-peacock/60 font-medium"
                }`}
              >
                {w === "today" ? t("whatsOn.today") : t("whatsOn.weekend")}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {!mandirs.length && <FollowedOnly href={here({})} />}
            <PlanLink />
          </div>
        </div>
        {active.length > 0 && (
          <ul aria-label={t("whatsOn.chosen")} className="flex flex-wrap gap-2">
            {active.map((f) => (
              <li key={f.href}>
                <Link
                  href={f.href}
                  aria-label={t("whatsOn.removeFilter", { filter: f.label })}
                  className="bg-ink text-bg inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-semibold no-underline"
                >
                  {f.label}
                  <span aria-hidden="true">✕</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted" aria-live="polite">
          {t.count("whatsOn.count", events.length)}
          {position &&
            events.length > 1 &&
            view === "list" &&
            t("whatsOn.nearestFirst")}
        </p>
      </div>
      {problem && <Notice tone="error">{problem}</Notice>}
      {events.length && view === "map" ? (
        <EventsMapView pins={pinsFor(events)} origin={position} />
      ) : events.length ? (
        <EventList
          events={events}
          now={new Date()}
          more={
            long
              ? { perDay: PER_DAY, href: (d) => here({ day: d }) }
              : undefined
          }
        />
      ) : (
        <div className="bg-sunk flex flex-col gap-2 rounded-3xl p-6">
          <p className="font-semibold">
            {position || region || kind || day || when || mandirs.length
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

// "Filter": the type of event and the region, folded behind one button
// so the events start near the top. Choosing one goes straight there.
function Filters({
  kind,
  region,
  count,
  here,
}: {
  kind: string;
  region: string;
  count: number;
  here: (change: { type?: string; region?: string }) => string;
}) {
  const t = pageT();
  const kinds = Object.entries(EVENT_KINDS)
    .filter(([value]) => value !== "other")
    .map(([value, english]) => ({
      value,
      label: kindLabel(value) ?? english,
    }));
  const regions = REGIONS.map((r) => ({ value: r, label: t(regionKey(r)!) }));
  return (
    <details className="group relative shrink-0">
      <summary
        className={`${pillButtonClass} list-none [&::-webkit-details-marker]:hidden`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
        {t("whatsOn.filter")}
        {count > 0 && (
          <span className="bg-peacock text-on-peacock rounded-full px-2 leading-6">
            {count}
          </span>
        )}
      </summary>
      <div className="border-line bg-surface absolute top-full right-0 z-20 mt-2 flex w-[min(calc(100vw-2rem),32rem)] flex-col gap-5 rounded-3xl border p-5 shadow-[0_20px_48px_rgba(0,0,0,0.18)]">
        <Choices
          title={t("whatsOn.type")}
          all={t("whatsOn.anyType")}
          options={kinds}
          chosen={kind}
          href={(value) => here({ type: value })}
        />
        <Choices
          title={t("whatsOn.region")}
          all={t("whatsOn.anywhere")}
          options={regions}
          chosen={region}
          href={(value) => here({ region: value })}
        />
      </div>
    </details>
  );
}

function Choices({
  title,
  all,
  options,
  chosen,
  href,
}: {
  title: string;
  all: string;
  options: { value: string; label: string }[];
  chosen: string;
  href: (value: string) => string;
}) {
  return (
    <nav aria-label={title} className="flex flex-col gap-2">
      <p className="font-semibold">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {[{ value: "", label: all }, ...options].map((o) => {
          const here = o.value === chosen;
          return (
            <li key={o.value || "all"}>
              <Link
                href={href(o.value)}
                aria-current={here ? "page" : undefined}
                className={`inline-block rounded-full border px-4 py-1.5 text-base whitespace-nowrap no-underline transition-colors ${
                  here
                    ? "border-ink bg-ink text-bg font-semibold"
                    : "border-line-strong bg-surface text-ink hover:border-peacock/60 font-medium"
                }`}
              >
                {o.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
