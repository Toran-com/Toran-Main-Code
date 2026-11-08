"use client";

import { useT } from "@/components/use-t";
import { enMap } from "@/lib/i18n/client/map";

// The key under a map (components/uk-map.ts): what a flame and a lamp
// with a number mean, and that tapping one opens it.
export function MapKey({ many }: { many: "mandirs" | "events" | "places" }) {
  const t = useT(enMap);
  return (
    <ul className="text-muted flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
      {many === "mandirs" && (
        <li className="flex items-center gap-2">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 32"
            className="h-6 w-[18px] shrink-0"
          >
            <path
              d="M12 1.5c5.2 6.5 7.6 11.2 7.6 16a7.6 7.6 0 0 1-15.2 0c0-4.8 2.4-9.5 7.6-16z"
              fill="#d9a441"
              stroke="#8a6418"
              strokeWidth="1.2"
            />
            <path
              d="M12 11c2.4 3.1 3.3 5.1 3.3 6.9a3.3 3.3 0 0 1-6.6 0c0-1.8.9-3.8 3.3-6.9z"
              fill="#fff4d6"
            />
          </svg>
          {t("mapUi.key.one")}
        </li>
      )}
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-[#d9a441] bg-[#14213d] text-base leading-none font-extrabold text-[#f6e7b8]"
        >
          3
        </span>
        {t(
          many === "mandirs"
            ? "mapUi.key.many"
            : many === "events"
              ? "mapUi.key.events"
              : "mapUi.key.places",
        )}
      </li>
    </ul>
  );
}
