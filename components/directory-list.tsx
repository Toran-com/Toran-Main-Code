"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { MapArea, MapGoTo } from "@/components/mandir-map";
import { Morph, morphName } from "@/components/morph";
import { OpenNow } from "@/components/open-now";
import { cardClass, inputClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import type { MandirSummary } from "@/lib/directory";
import {
  anchorFor,
  groupByRegionAndTown,
  matchesSearch,
} from "@/lib/directory-format";
import { distanceMiles, postcodeIn, type Position } from "@/lib/geo";
import { enMandirs, regionKey } from "@/lib/i18n/client/mandirs";
import { enMap } from "@/lib/i18n/client/map";
import { withLocale } from "@/lib/i18n/paths";
import { onTheMap } from "@/lib/map-clusters";
import { readSessions } from "@/lib/opening-hours";

// The map code (Leaflet, and the street map) is only downloaded when the
// map is shown.
const MandirMap = dynamic(
  () => import("@/components/mandir-map").then((m) => m.MandirMap),
  {
    ssr: false,
    loading: () => <div className="bg-sunk h-full w-full animate-pulse" />,
  },
);

type View = "map" | "list";

// Opening and closing times and day names, ready in the page's language.
export type HoursWords = {
  times: Record<string, string>;
  days: Record<number, string>;
};

// Wide enough for the list and the map side by side.
const WIDE = "(min-width: 1024px)";
function onResize(update: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}
const isWide = () => window.matchMedia(WIDE).matches;

// The mandir finder, like the best shop finders: one search box (a town,
// a postcode or a mandir's name), "Near me", and the mandirs as a list
// beside a map. On a computer the two sit side by side: pointing at a
// mandir in the list lifts its pin, choosing a pin picks it out in the
// list, and the list follows the map as it moves. On a phone, "Map" and
// "List" switch between them. Every mandir shows its town and tradition,
// whether it's open now, and how far away it is once we know where you
// are. Without JavaScript, the full list by region is shown instead.
export function DirectoryList({
  mandirs,
  hours,
}: {
  mandirs: MandirSummary[];
  hours: HoursWords;
}) {
  const t = useT(enMandirs);
  const wide = useSyncExternalStore(onResize, isWide, () => false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(() =>
    onTheMap(mandirs).length > 0 ? "map" : "list",
  );
  const [you, setYou] = useState<Position | null>(null);
  const [finding, setFinding] = useState<
    "idle" | "finding" | "denied" | "failed"
  >("idle");
  // The last postcode looked up, and what came back.
  const [found, setFound] = useState<{
    postcode: string;
    at: Position | null;
    state: "looking" | "found" | "unknown";
  } | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [pointed, setPointed] = useState<string | null>(null);
  const [area, setArea] = useState<MapArea | null>(null);
  const [goTo, setGoTo] = useState<MapGoTo | null>(null);
  const inputId = useId();
  const list = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const focusCard = useRef(false);
  const moves = useRef(0);

  const postcode = postcodeIn(query);
  const searching = query.trim().length > 0 && !postcode;
  const matched = useMemo(
    () => (postcode ? mandirs : mandirs.filter((m) => matchesSearch(m, query))),
    [mandirs, query, postcode],
  );
  const placed = onTheMap(mandirs);
  const missing = mandirs.length - placed.length;

  // A postcode moves the map there and lists the nearest first. Looked up
  // through Toran (app/api/place), a moment after typing stops.
  const looked = found && found.postcode === postcode ? found : null;
  const place =
    looked?.state === "found" && looked.at && postcode
      ? { label: postcode, at: looked.at }
      : null;
  const lookup = looked?.state ?? "idle";
  useEffect(() => {
    if (!postcode) return;
    let stale = false;
    const timer = window.setTimeout(async () => {
      setFound({ postcode, at: null, state: "looking" });
      try {
        const response = await fetch(
          `/api/place?q=${encodeURIComponent(postcode)}`,
        );
        const at = response.ok ? ((await response.json()) as Position) : null;
        if (stale) return;
        setFound({ postcode, at, state: at ? "found" : "unknown" });
        if (at) setGoTo({ at, zoom: 11, key: ++moves.current });
      } catch {
        if (!stale) setFound({ postcode, at: null, state: "unknown" });
      }
    }, 450);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [postcode]);

  // On a computer, once the map is moved or zoomed so that it leaves
  // some of the mandirs out, the list is what's on the map, nearest the
  // middle first.
  const onMapNow = matched.filter(
    (m) =>
      m.latitude !== null &&
      m.longitude !== null &&
      (!area ||
        (m.latitude >= area.south &&
          m.latitude <= area.north &&
          m.longitude >= area.west &&
          m.longitude <= area.east)),
  );
  const partial =
    wide && area !== null && onMapNow.length < onTheMap(matched).length;

  // Where distances are measured from: you, the postcode, or the middle
  // of the part of the map shown.
  const from = you ?? place?.at ?? null;
  const order = from ?? (partial && area ? area.middle : null);
  const listed = (() => {
    const shown = partial ? onMapNow : matched;
    if (!order) return shown;
    const away = (m: MandirSummary) =>
      m.latitude === null || m.longitude === null
        ? Infinity
        : distanceMiles(order, {
            latitude: m.latitude,
            longitude: m.longitude,
          });
    return [...shown].sort((a, b) => away(a) - away(b));
  })();

  // The chosen mandir, while the search still includes it.
  const chosenMandirs = matched.filter((m) => chosen.includes(m.slug));

  // Choosing a pin on the map picks it out in the list. Chosen from the
  // keyboard, its card takes the focus.
  function chooseOnMap(slugs: string[], byKeyboard: boolean) {
    setChosen(slugs);
    focusCard.current = byKeyboard;
    if (wide) {
      list.current
        ?.querySelector(`[data-slug="${CSS.escape(slugs[0])}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
  useEffect(() => {
    if (!chosen.length) return;
    if (focusCard.current) {
      focusCard.current = false;
      card.current?.focus();
    }
    // On a phone the card can be below the screen's edge: bring it up.
    if (!wide) {
      card.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [chosen, wide]);

  // "Show on map" in the list.
  function showOnMap(m: MandirSummary) {
    if (m.latitude === null || m.longitude === null) return;
    setChosen([m.slug]);
    setView("map");
    setGoTo({
      at: { latitude: m.latitude, longitude: m.longitude },
      zoom: 14,
      key: ++moves.current,
    });
  }

  // Escape closes the chosen mandir's card.
  useEffect(() => {
    if (!chosen.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChosen([]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [chosen]);

  // "Near me": the browser asks first, and Toran never sends or keeps
  // where you are.
  function nearMe() {
    if (!("geolocation" in navigator)) {
      setFinding("failed");
      return;
    }
    setFinding("finding");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const at = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setYou(at);
        setFinding("idle");
        setGoTo({ at, zoom: 11, key: ++moves.current });
      },
      (error) =>
        setFinding(
          error.code === error.PERMISSION_DENIED ? "denied" : "failed",
        ),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const regionName = (region: string) => {
    const key = regionKey(region);
    return key ? t(key) : region;
  };
  const row = (m: MandirSummary) => (
    <MandirRow
      key={m.slug}
      mandir={m}
      from={from}
      hours={hours}
      chosen={chosen.includes(m.slug)}
      onPoint={setPointed}
      onShow={() => showOnMap(m)}
    />
  );

  const showMap = wide || view === "map";
  const showList = wide || view === "list";

  const count = partial
    ? t(listed.length === 1 ? "mandirs.inView.one" : "mandirs.inView.other", {
        count: listed.length,
      })
    : searching
      ? t("mandirs.countOf", { shown: matched.length, total: mandirs.length })
      : t("mandirs.count", { total: mandirs.length });
  const sortedBy = you
    ? t("mandirs.nearYou")
    : place
      ? t("mandirs.nearPlace", { place: place.label })
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="needs-js border-line bg-surface shadow-card overflow-hidden rounded-2xl border lg:grid lg:h-[min(80vh,800px)] lg:min-h-[560px] lg:grid-cols-[minmax(340px,420px)_1fr]">
        {/* The finder's own side: search, Near me, and the list. */}
        <div className="lg:border-line flex min-h-0 flex-col lg:border-r">
          <div className="border-line flex flex-col gap-3 border-b p-4 sm:p-5">
            <SearchBox
              id={inputId}
              query={query}
              setQuery={setQuery}
              label={t("mandirs.find")}
              placeholder={t("mandirs.findExample")}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="flex flex-col" aria-live="polite">
                <p className="text-ink text-base font-semibold">{count}</p>
                {sortedBy && <p className="text-muted text-base">{sortedBy}</p>}
              </div>
              <button
                type="button"
                onClick={nearMe}
                disabled={finding === "finding"}
                className="needs-js border-line-strong bg-surface text-ink hover:border-peacock/60 [&_svg]:text-peacock inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-base font-semibold transition duration-200 active:scale-95 disabled:opacity-60"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={`size-5 ${finding === "finding" ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {finding === "finding"
                  ? t("whatsOn.finding")
                  : t("whatsOn.nearMe")}
              </button>
            </div>
            <p className="text-muted text-base empty:hidden" aria-live="polite">
              {finding === "denied" && t("map.denied")}
              {finding === "failed" && t("map.failed")}
              {lookup === "looking" &&
                postcode &&
                t("mandirs.lookingUp", { place: postcode })}
              {lookup === "unknown" &&
                postcode &&
                t("mandirs.unknownPlace", { place: postcode })}
            </p>

            {/* On a phone: the map or the list, like tabs. */}
            <div
              role="group"
              aria-label={t("mandirs.showAs")}
              className="needs-js border-line -mx-4 -mb-4 flex border-t sm:-mx-5 sm:-mb-5 lg:hidden"
            >
              {(["map", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 text-base font-semibold transition-colors after:absolute after:inset-x-6 after:bottom-0 after:h-[3px] after:rounded-full after:transition-colors ${
                    view === v
                      ? "text-ink after:bg-peacock"
                      : "text-muted hover:text-ink after:bg-transparent"
                  }`}
                >
                  {v === "map" ? <PinIcon /> : <ListIcon />}
                  {v === "map" ? t("mandirs.map") : t("mandirs.list")}
                </button>
              ))}
            </div>
          </div>

          {showList && (
            <div
              ref={list}
              className="needs-js min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {listed.length === 0 ? (
                <p className="p-5 text-lg">
                  {searching
                    ? t("mandirs.noMatch", { query: query.trim() })
                    : t("mandirs.noneHere")}
                </p>
              ) : order ? (
                // Nearest first.
                <ol className="divide-line divide-y">
                  {listed.map((m) => row(m))}
                </ol>
              ) : (
                // By region, then town.
                groupByRegionAndTown(listed).map(({ region, towns }) => (
                  <section
                    key={region}
                    aria-labelledby={`${inputId}-${anchorFor(region)}`}
                  >
                    <h2
                      id={`${inputId}-${anchorFor(region)}`}
                      className="border-line bg-sunk/95 text-ink sticky top-0 z-[1] border-y px-4 py-2 text-base font-bold backdrop-blur sm:px-5"
                    >
                      {regionName(region)}
                    </h2>
                    <ol className="divide-line divide-y">
                      {towns.flatMap(({ mandirs: inTown }) =>
                        inTown.map((m) => row(m)),
                      )}
                    </ol>
                  </section>
                ))
              )}
            </div>
          )}
        </div>

        {showMap && (
          <MandirMap
            className="needs-js h-[68svh] min-h-96 lg:h-full lg:min-h-0"
            mandirs={matched}
            chosen={chosen}
            pointed={pointed}
            onChoose={chooseOnMap}
            onArea={setArea}
            goTo={goTo}
            you={you}
            place={place?.at ?? null}
          >
            {chosenMandirs.length > 0 && (
              <div
                ref={card}
                tabIndex={-1}
                role="region"
                aria-label={t("map.cardLabel", {
                  name: chosenMandirs.map((m) => m.name).join(", "),
                })}
                className="border-line bg-surface shadow-lift focus-visible:ring-peacock absolute inset-x-3 bottom-3 flex max-h-[min(60%,22rem)] scroll-mb-28 flex-col overflow-y-auto rounded-2xl border p-4 pr-14 outline-none focus-visible:ring-3 md:scroll-mb-4 lg:right-auto lg:bottom-5 lg:left-5 lg:w-[380px]"
              >
                <button
                  type="button"
                  onClick={() => setChosen([])}
                  aria-label={t("map.closeCard")}
                  className="text-muted hover:bg-sunk hover:text-ink absolute top-2 right-2 grid size-11 cursor-pointer place-items-center rounded-full text-2xl leading-none"
                >
                  ×
                </button>
                <div className="divide-line flex flex-col divide-y">
                  {chosenMandirs.map((m) => (
                    <ChosenMandir
                      key={m.slug}
                      mandir={m}
                      from={from}
                      hours={hours}
                    />
                  ))}
                </div>
              </div>
            )}
          </MandirMap>
        )}
      </div>

      {missing > 0 && !partial && (
        <p className="needs-js text-muted text-base">
          {missing === mandirs.length
            ? t("map.noneOnMap")
            : t(missing === 1 ? "map.missing.one" : "map.missing.other", {
                count: missing,
              })}
        </p>
      )}

      {/* Without JavaScript there's no map, so show the list by region. */}
      <noscript>
        <style>{".needs-js { display: none !important; }"}</style>
        <MandirGroups mandirs={mandirs} withRegions />
      </noscript>
    </div>
  );
}

function SearchBox({
  id,
  query,
  setQuery,
  label,
  placeholder,
}: {
  id: string;
  query: string;
  setQuery: (value: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-2xl leading-tight">
        {label}
      </label>
      <div className="relative">
        <SearchIcon />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className={`${inputClass} pl-12`}
        />
      </div>
    </div>
  );
}

// How far away: in words for the chosen mandir's card ("Less than a mile
// away", "3 miles away"), or short for the list ("0.4 mi", "12 mi").
function useAway() {
  const t = useT(enMandirs);
  const tm = useT(enMap);
  return (from: Position | null, m: MandirSummary, short = false) => {
    if (!from || m.latitude === null || m.longitude === null) return null;
    const miles = distanceMiles(from, {
      latitude: m.latitude,
      longitude: m.longitude,
    });
    if (short) {
      const shown =
        miles < 10 ? Math.max(0.1, miles).toFixed(1) : Math.round(miles);
      return t("map.milesShort", { miles: shown });
    }
    if (miles < 1) return tm("mapUi.under");
    const rounded = Math.round(miles);
    return rounded === 1
      ? tm("mapUi.miles.one")
      : tm("mapUi.miles.other", { miles: rounded });
  };
}

// One mandir in the list: its name (the way to its page), town and
// tradition, whether it's open now, how far away, and "Show on map".
function MandirRow({
  mandir: m,
  from,
  hours,
  chosen,
  onPoint,
  onShow,
}: {
  mandir: MandirSummary;
  from: Position | null;
  hours: HoursWords;
  chosen: boolean;
  onPoint: (slug: string | null) => void;
  onShow: () => void;
}) {
  const t = useT(enMandirs);
  const locale = useLocale();
  const away = useAway()(from, m, true);
  const sessions = readSessions(m.opening_hours);
  const onMap = m.latitude !== null && m.longitude !== null;
  return (
    <li
      data-slug={m.slug}
      onMouseEnter={() => onPoint(m.slug)}
      onMouseLeave={() => onPoint(null)}
      onFocus={() => onPoint(m.slug)}
      onBlur={() => onPoint(null)}
      className={`relative flex items-start gap-3 px-4 py-4 transition-colors sm:px-5 ${
        chosen
          ? "bg-marigold/10 before:bg-marigold before:absolute before:inset-y-0 before:left-0 before:w-1"
          : "hover:bg-sunk/60"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Morph name={morphName.mandir(m.slug)}>
          <Link
            href={withLocale(`/mandirs/${m.slug}`, locale)}
            className="text-ink hover:text-peacock text-lg leading-snug font-semibold no-underline"
          >
            {m.name}
          </Link>
        </Morph>
        <p className="text-muted text-base">
          {[m.town, m.tradition].filter(Boolean).join(" · ")}
        </p>
        {sessions.length > 0 && (
          <OpenNow
            sessions={sessions}
            times={hours.times}
            days={hours.days}
            line
          />
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {away && (
          <span className="text-muted text-base whitespace-nowrap">{away}</span>
        )}
        {onMap && (
          <button
            type="button"
            onClick={onShow}
            aria-label={t("map.showOnMap", { name: m.name })}
            title={t("map.showOnMapShort")}
            className="needs-js border-line-strong text-peacock hover:border-peacock/60 hover:bg-sunk grid size-11 cursor-pointer place-items-center rounded-full border transition-colors"
          >
            <PinIcon />
          </button>
        )}
      </div>
    </li>
  );
}

// The chosen mandir, in the card over the map.
function ChosenMandir({
  mandir: m,
  from,
  hours,
}: {
  mandir: MandirSummary;
  from: Position | null;
  hours: HoursWords;
}) {
  const t = useT(enMandirs);
  const tm = useT(enMap);
  const locale = useLocale();
  const away = useAway()(from, m);
  const sessions = readSessions(m.opening_hours);
  return (
    <div className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <p className="font-display text-2xl leading-tight">{m.name}</p>
      <p className="text-muted text-base">
        {[m.town, m.tradition, away].filter(Boolean).join(" · ")}
      </p>
      {sessions.length > 0 && (
        <OpenNow
          sessions={sessions}
          times={hours.times}
          days={hours.days}
          line
        />
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href={withLocale(`/mandirs/${m.slug}`, locale)}
          className="toran-card-main bg-peacock text-on-peacock inline-flex min-h-11 items-center rounded-full px-5 text-base font-bold no-underline"
        >
          {t("map.seeWhatsOn")}
        </Link>
        {m.latitude !== null && m.longitude !== null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${m.latitude},${m.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tm("mapUi.directionsLabel", { name: m.name })}
            className="toran-card-quiet border-line-strong text-peacock hover:bg-sunk inline-flex min-h-11 items-center rounded-full border-2 px-5 text-base font-bold no-underline"
          >
            {tm("mapUi.directions")}
          </a>
        )}
      </div>
    </div>
  );
}

function MandirGroups({
  mandirs,
  withRegions,
}: {
  mandirs: MandirSummary[];
  withRegions: boolean;
}) {
  const t = useT(enMandirs);
  const locale = useLocale();
  const groups = groupByRegionAndTown(mandirs);
  const regionName = (region: string) => {
    const key = regionKey(region);
    return key ? t(key) : region;
  };
  return (
    <div className="rise-list flex flex-col gap-8">
      {withRegions && (
        <nav aria-label={t("mandirs.regions")}>
          <ul className="flex flex-wrap gap-2">
            {groups.map(({ region }) => (
              <li key={region}>
                <a
                  href={`#${anchorFor(region)}`}
                  className="border-line-strong bg-surface text-ink hover:border-peacock/60 inline-block rounded-full border px-4 py-1.5 text-base no-underline transition-colors"
                >
                  {regionName(region)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {groups.map(({ region, towns }) => (
        <section
          key={region}
          id={anchorFor(region)}
          aria-labelledby={`${anchorFor(region)}-heading`}
          className="flex scroll-mt-4 flex-col gap-5"
        >
          <h2
            id={`${anchorFor(region)}-heading`}
            className="font-display text-4xl leading-tight"
          >
            {regionName(region)}
          </h2>
          <div className="grid items-start gap-x-10 gap-y-6 md:grid-cols-2">
            {towns.map(({ town, mandirs: list }) => (
              <div key={town} className="flex flex-col gap-2">
                <h3 className="text-muted flex items-center gap-2 text-lg font-semibold">
                  <span
                    aria-hidden="true"
                    className="bg-marigold size-2 rotate-45 rounded-[1px]"
                  />
                  {town}
                </h3>
                <ul className={`${cardClass} divide-line divide-y`}>
                  {list.map((m) => (
                    <li key={m.slug}>
                      <Link
                        href={withLocale(`/mandirs/${m.slug}`, locale)}
                        className="hover:bg-sunk flex flex-col px-4 py-3 no-underline transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                      >
                        <span className="text-peacock font-semibold">
                          {m.name}
                        </span>
                        {m.tradition && (
                          <span className="text-muted text-base">
                            {m.tradition}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SearchIcon() {
  return (
    <svg
      {...iconProps}
      className="text-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg {...iconProps} className="size-5">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps} className="size-5">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
