"use client";

import { useT } from "@/components/use-t";
import { enMap } from "@/lib/i18n/client/map";

// The key under the What's on and Seva maps (components/uk-map.ts): what
// a circle with a number means, and that tapping one opens it.
export function MapKey({ many }: { many: "events" | "places" }) {
  const t = useT(enMap);
  return (
    <ul className="text-muted flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-white bg-[#14213d] text-base leading-none font-extrabold text-white shadow-[0_0_0_2px_#d9a441]"
        >
          3
        </span>
        {t(many === "events" ? "mapUi.key.events" : "mapUi.key.places")}
      </li>
    </ul>
  );
}
