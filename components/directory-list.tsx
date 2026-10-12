"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { MandirSummary } from "@/lib/directory";
import { anchorFor, groupByRegionAndTown, matchesSearch } from "@/lib/format";
import { inputClass } from "@/components/ui";

// The mandir list with a search box. The full list is rendered on the
// server, so it works before (and without) JavaScript; typing filters it.
export function DirectoryList({ mandirs }: { mandirs: MandirSummary[] }) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const shown = mandirs.filter((m) => matchesSearch(m, query));
  const groups = groupByRegionAndTown(shown);
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

      {!searching && (
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

      {shown.length === 0 && (
        <p className="text-lg">
          No mandirs match &ldquo;{query.trim()}&rdquo;. Try a nearby town, or
          check the spelling.
        </p>
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
