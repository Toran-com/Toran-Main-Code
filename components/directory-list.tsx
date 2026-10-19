"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { MandirSummary } from "@/lib/directory";
import { useLocale, useT } from "@/components/use-t";
import { enMandirs } from "@/lib/i18n/client/mandirs";
import {
  anchorFor,
  groupByRegionAndTown,
  matchesSearch,
} from "@/lib/directory-format";
import { withLocale } from "@/lib/i18n/paths";
import { onTheMap } from "@/lib/map-clusters";
import { cardClass, inputClass } from "@/components/ui";

// The map code (Leaflet) is only downloaded when the map is shown.
const MandirMap = dynamic(
  () => import("@/components/mandir-map").then((m) => m.MandirMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-line bg-sunk shadow-card h-[60vh] min-h-80 w-full animate-pulse rounded-2xl border" />
    ),
  },
);

type View = "map" | "list";

// The mandirs as a map or a list, with one search box for both. The map is
// the default once mandirs have map positions; the full list is still
// rendered on the server for anyone without JavaScript, and typing filters
// whichever view is showing.
export function DirectoryList({ mandirs }: { mandirs: MandirSummary[] }) {
  const t = useT(enMandirs);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(() =>
    onTheMap(mandirs).length > 0 ? "map" : "list",
  );
  const inputId = useId();
  const shown = useMemo(
    () => mandirs.filter((m) => matchesSearch(m, query)),
    [mandirs, query],
  );
  const searching = query.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-lg font-semibold">
          {t("mandirs.find")}
        </label>
        <div className="relative">
          <SearchIcon />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("mandirs.findExample")}
            autoComplete="off"
            className={`${inputClass} pl-12`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted text-base" aria-live="polite">
          {searching
            ? t("mandirs.countOf", {
                shown: shown.length,
                total: mandirs.length,
              })
            : t("mandirs.count", { total: mandirs.length })}
        </p>
        {/* A switch whose peacock pill slides to the chosen view. */}
        <div
          role="group"
          aria-label={t("mandirs.showAs")}
          className="needs-js border-line bg-surface shadow-card relative grid w-fit grid-cols-2 rounded-full border p-1"
        >
          <span
            aria-hidden="true"
            className={`from-peacock to-peacock-deep shadow-card absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-linear-to-b transition-transform duration-300 ease-out ${
              view === "list" ? "translate-x-full" : ""
            }`}
          />
          {(["map", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`relative flex items-center justify-center gap-2 rounded-full px-5 py-2 text-base font-semibold transition-colors duration-300 ${
                view === v ? "text-on-peacock" : "hover:text-peacock"
              }`}
            >
              {v === "map" ? <PinIcon /> : <ListIcon />}
              {v === "map" ? t("mandirs.map") : t("mandirs.list")}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 && (
        <p className="text-lg">
          {t("mandirs.noMatch", { query: query.trim() })}
        </p>
      )}

      {view === "map" ? (
        <>
          {shown.length > 0 && (
            <div className="needs-js">
              <MandirMap mandirs={shown} />
            </div>
          )}
          {/* Without JavaScript there's no map, so show the list instead. */}
          <noscript>
            <style>{".needs-js { display: none; }"}</style>
            <MandirGroups mandirs={mandirs} withRegions />
          </noscript>
        </>
      ) : (
        <MandirGroups mandirs={shown} withRegions={!searching} />
      )}
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
  return (
    <div className="rise-list flex flex-col gap-8">
      {withRegions && (
        <nav aria-label={t("mandirs.regions")}>
          <ul className="flex flex-wrap gap-2">
            {groups.map(({ region }) => (
              <li key={region}>
                <a
                  href={`#${anchorFor(region)}`}
                  className="border-line bg-surface hover:border-marigold/60 hover:text-peacock inline-block rounded-full border px-3 py-1 text-base no-underline shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5"
                >
                  {region}
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
            className="font-display text-3xl font-bold"
          >
            {region}
          </h2>
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
                      className="group hover:bg-sunk flex items-center gap-3 px-4 py-3 no-underline transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                    >
                      <span className="flex flex-1 flex-col">
                        <span className="text-peacock font-semibold">
                          {m.name}
                        </span>
                        {m.tradition && (
                          <span className="text-muted text-base">
                            {m.tradition}
                          </span>
                        )}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-marigold-ink -translate-x-1 text-xl opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
