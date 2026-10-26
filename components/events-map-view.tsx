"use client";

import dynamic from "next/dynamic";
import type { EventPin } from "@/components/events-map";
import type { Position } from "@/lib/geo";

// The map's code (Leaflet) loads only when the map is shown.
const EventsMap = dynamic(
  () => import("@/components/events-map").then((m) => m.EventsMap),
  {
    ssr: false,
    loading: () => (
      <div className="border-line bg-sunk shadow-card h-[65vh] min-h-80 w-full animate-pulse rounded-2xl border" />
    ),
  },
);

export function EventsMapView(props: {
  pins: EventPin[];
  origin: Position | null;
}) {
  return <EventsMap {...props} />;
}
