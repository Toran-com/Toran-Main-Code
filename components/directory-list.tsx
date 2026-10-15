"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { MandirSummary } from "@/lib/directory";
import { anchorFor, groupByRegionAndTown, matchesSearch } from "@/lib/format";
import { onTheMap } from "@/lib/map-clusters";
import { inputClass } from "@/components/ui";

// The map code (Leaflet) is only downloaded when the map is shown.
const MandirMap = dynamic(
  () => import("@/components/mandir-map").then((m) => m.MandirMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-line bg-sunk h-[60vh] min-h-80 w-full rounded-2xl border" />
    ),
  },
);

type View = "map" | "list";

// The mandirs as a map or a list, with one search box for both. The map is
// the default once mandirs have map positions; the full list is still
// rendered on the server for anyone without JavaScript, and typing filters
// whichever view is showing.
export function DirectoryList({ mandirs }: { mandirs: MandirSummary[] }) {
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-lg font-semibold">
          Find a mandir or town
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Leicester, BAPS, Harrow"
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-muted text-base" aria-live="polite">
          {searching
            ? `${shown.length} of ${mandirs.length} mandirs`
            : `${mandirs.length} mandirs`}
        </p>
      </div>

      <div
        role="group"
        aria-label="Show mandirs as"
        className="needs-js border-line bg-surface flex w-fit rounded-full border p-1"
      >
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-full px-5 py-2 text-base font-semibold ${
              view === v ? "bg-peacock text-on-peacock" : "hover:bg-sunk"
            }`}
          >
            {v === "map" ? "Map" : "List"}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="text-lg">
          No mandirs match &ldquo;{query.trim()}&rdquo;. Try a nearby town, or
          check the spelling.
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
  const groups = groupByRegionAndTown(mandirs);
  return (
    <div className="flex flex-col gap-8">
      {withRegions && (
        <nav aria-label="Regions">
          <ul className="flex flex-wrap gap-2">
            {groups.map(({ region }) => (
              <li key={region}>
                <a
                  href={`#${anchorFor(region)}`}
                  className="border-line hover:bg-sunk inline-block rounded-full border px-3 py-1 text-base"
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
              <h3 className="text-muted text-lg font-semibold">{town}</h3>
              <ul className="border-line bg-surface divide-line divide-y rounded-2xl border">
                {list.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={`/mandirs/${m.slug}`}
                      className="hover:bg-sunk flex flex-col px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl"
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
        </section>
      ))}
    </div>
  );
}
