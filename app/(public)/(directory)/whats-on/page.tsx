import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty } from "@/components/empty";
import { EventList, POSTCODE_CREDIT } from "@/components/event-list";
import { EventsMapView } from "@/components/events-map-view";
import { FollowedOnly } from "@/components/follow";
import { PlanLink } from "@/components/plan";
import { PlacePicker } from "@/components/place-picker";
import { LoadProblem, PageHeading } from "@/components/public-shell";
import { WhatsOnSkeleton } from "@/components/skeletons";
import { Notice, pillButtonClass } from "@/components/ui";
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
  // Full width from laptop size up: the choices in a column on the left
  // that stays in view, the events beside them.
  return (
    <div className="page-wide flex flex-col gap-6 sm:gap-8">
      <PageHeading title={t("whatsOn.title")} intro={t("whatsOn.intro")} />
      <Suspense fallback={<WhatsOnSkeleton />}>
        <WhatsOn {...props} />
      </Suspense>
    </div>
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
    near?: string;
    within?: number;
  }) => {
    const params = new URLSearchParams();
    const n = change.near ?? near;
    const w2 = change.within ?? within;
    if (n) params.set("near", n);
    if (n && w2 !== 15) params.set("within", String(w2));
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
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-3 lg:sticky lg:top-28">
        {place}
        {/* On a phone, the way to the map (or back to the list) floats
            just above the bar along the bottom, always in reach, and
            Filter and the days share one row, so the first events show on
            the first screen. On a
            laptop they sit in the rail. Wraps with big text on a small
            phone; the filter panel then opens across the whole row. */}
        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-3">
          <nav
            aria-label={t("whatsOn.showAs")}
            className="lg:border-line-strong lg:bg-surface fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 flex rounded-full md:bottom-6 lg:static lg:order-1 lg:border lg:p-1"
          >
            {(["list", "map"] as const).map((v) => (
              <Link
                key={v}
                href={here({ view: v })}
                aria-current={view === v ? "page" : undefined}
                // On a phone only the other view shows, as one floating
                // button ("Map" over the list, "List" over the map).
                className={`rounded-full text-base font-semibold no-underline transition-colors lg:px-4 lg:py-1 ${
                  view === v
                    ? "lg:bg-ink lg:text-bg max-lg:sr-only"
                    : "max-lg:bg-ink max-lg:text-bg max-lg:shadow-lift lg:text-ink lg:hover:bg-sunk inline-flex items-center gap-2 max-lg:px-5 max-lg:py-3"
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5 lg:hidden"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {v === "map" ? (
                    <>
                      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                      <circle cx="12" cy="9.5" r="2.5" />
                    </>
                  ) : (
                    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
                  )}
                </svg>
                {v === "list" ? t("whatsOn.list") : t("whatsOn.map")}
              </Link>
            ))}
          </nav>
          <div className="lg:order-2 lg:ml-auto">
            <Filters
              key={`${kind}|${region}`}
              kind={kind}
              region={region}
              count={(kind ? 1 : 0) + (region ? 1 : 0)}
              here={here}
            />
          </div>
          <nav
            aria-label={t("whatsOn.when")}
            className="flex gap-2 lg:order-3 lg:w-full"
          >
            {(["today", "weekend"] as const).map((w) => (
              <Link
                key={w}
                href={here({ when: when === w ? "" : w })}
                aria-current={when === w ? "page" : undefined}
                className={`inline-flex rounded-full border px-3 py-1.5 text-base no-underline transition-colors sm:px-4 ${
                  when === w
                    ? "border-ink bg-ink text-bg font-semibold"
                    : "border-line-strong bg-surface text-ink hover:border-peacock/60 font-medium"
                }`}
              >
                {w === "today" ? t("whatsOn.today") : t("whatsOn.weekend")}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-muted" aria-live="polite">
            {t.count("whatsOn.count", events.length)}
            {position &&
              events.length > 1 &&
              view === "list" &&
              t("whatsOn.nearestFirst")}
          </p>
          {!mandirs.length && <FollowedOnly href={here({})} />}
          <PlanLink />
          <Link
            href={localePath("/regular")}
            className="text-peacock font-semibold underline"
          >
            {t("whatsOn.regular")}
          </Link>
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
      </div>
      <div className="flex min-w-0 flex-col gap-6">
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
          <Empty
            title={
              position || region || kind || day || when || mandirs.length
                ? t("whatsOn.noneThere")
                : t("whatsOn.noneYet")
            }
            steps={[
              // Look further afield first: the next distance up.
              ...(position && within < RADII[RADII.length - 1]
                ? [
                    {
                      href: here({
                        within: RADII.find((r) => r > within) ?? within,
                      }),
                      label: t("whatsOn.wider", {
                        miles: RADII.find((r) => r > within) ?? within,
                      }),
                    },
                  ]
                : []),
              ...(region || kind || day || when || mandirs.length
                ? [
                    {
                      href: here({
                        region: "",
                        type: "",
                        day: "",
                        when: "",
                        mandirs: "",
                      }),
                      label: t("whatsOn.everything"),
                    },
                  ]
                : []),
              ...(near
                ? [{ href: here({ near: "" }), label: t("whatsOn.allUk") }]
                : []),
            ]}
          >
            {t("whatsOn.emptyBefore")}
            <Link
              href={localePath("/mandirs")}
              className="text-peacock underline"
            >
              {t("whatsOn.emptyLink")}
            </Link>
            {t("whatsOn.emptyAfter")}
          </Empty>
        )}
        {position && <p className="text-muted text-base">{POSTCODE_CREDIT}</p>}
      </div>
    </div>
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
    <details data-popover="" className="group shrink-0 lg:relative">
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
      <div className="pop-in border-line bg-surface absolute top-full right-0 left-0 z-20 mt-2 flex flex-col gap-5 rounded-3xl border p-5 shadow-[0_20px_48px_rgba(0,0,0,0.18)] lg:right-auto lg:w-[32rem]">
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
                className={`inline-block rounded-full border px-4 py-1.5 text-base no-underline transition-colors ${
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
