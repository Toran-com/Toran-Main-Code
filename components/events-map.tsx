"use client";

import type { LeafletKeyboardEvent, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import {
  cityLabels,
  keepLitWhileOpen,
  lamp,
  makeUkMap,
} from "@/components/uk-map";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { enEventsMap } from "@/lib/i18n/client/events-map";
import { clusterApart } from "@/lib/map-clusters";

// What's on as a map of the UK (uk-map.ts): a lamp at each mandir with
// events in the list, bigger where there are more, with the number on it.
// Tapping one lists its next events, each a link to its page. Mandirs too
// close to show apart share one lamp, until zoomed in. Loaded only when
// the map is chosen, like the mandirs and seva maps (decision 0011).

export type EventPin = {
  slug: string;
  name: string;
  town: string;
  latitude: number;
  longitude: number;
  count: number;
  // The first few, the time already in words ("Sat 14 Nov, 6pm").
  events: { when: string; title: string; path: string }[];
  more: string;
};

// How far apart lamps' centres stay (the biggest is about 53px wide), and
// how big a lamp is for its number of events.
const APART = 58;
const sizeFor = (count: number) => 1 + Math.min(0.25, Math.sqrt(count) * 0.05);

type Translate = ReturnType<typeof useT<keyof typeof enEventsMap>>;

// The card that opens on a pin, built from text (never HTML): each
// mandir's name and its next events.
function card(pins: EventPin[], t: Translate): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  for (const pin of pins) box.append(...section(pin, t));
  return box;
}

function section(pin: EventPin, t: Translate): HTMLElement[] {
  const parts: HTMLElement[] = [];
  const name = document.createElement("p");
  name.className = "toran-popup-name";
  name.textContent = `${pin.name}, ${pin.town}`;
  parts.push(name);
  for (const event of pin.events) {
    const line = document.createElement("p");
    const when = document.createElement("span");
    when.className = "toran-popup-when";
    when.textContent = event.when;
    const link = document.createElement("a");
    link.href = event.path;
    link.textContent = event.title;
    line.append(when, link);
    parts.push(line);
  }
  if (pin.count > pin.events.length) {
    const more = document.createElement("a");
    more.href = pin.more;
    more.textContent = t("eventsMap.more", {
      count: pin.count - pin.events.length,
    });
    parts.push(more);
  }
  return parts;
}

export function EventsMap({
  pins,
  origin,
}: {
  pins: EventPin[];
  origin: Position | null;
}) {
  const t = useT(enEventsMap);
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<{
    L: typeof import("leaflet");
    map: LeafletMap;
    layer: import("leaflet").LayerGroup;
    places: ReturnType<typeof cityLabels>;
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      made = makeUkMap(L, box.current);
      live.current = {
        L,
        map: made,
        layer: L.layerGroup().addTo(made),
        places: cityLabels(L, made),
      };
      setReady(true);
    });
    return () => {
      cancelled = true;
      made?.remove();
      live.current = null;
    };
  }, []);

  // Draw the circles, again at every zoom (groups split as you zoom in).
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, layer, places } = now;
    // The busiest first, so they keep their place when grouped.
    const ordered = [...pins].sort((a, b) => b.count - a.count);
    // After zooming in from the keyboard, the circle to keep focus on.
    let refocus: string | null = null;

    // The lights come on the first time they're drawn, not at every zoom.
    let firstDraw = true;
    const draw = () => {
      layer.clearLayers();
      const lights: [number, number][] = [];
      const groups = clusterApart(
        ordered,
        (p) => map.latLngToLayerPoint([p.latitude, p.longitude]),
        APART,
      );
      groups.forEach(({ items }, order) => {
        const [first] = items;
        lights.push([first.latitude, first.longitude]);
        const count = items.reduce((sum, p) => sum + p.count, 0);
        const label =
          items.length === 1
            ? t(count === 1 ? "eventsMap.pin.one" : "eventsMap.pin.other", {
                name: first.name,
                town: first.town,
                count,
              })
            : t("eventsMap.group", { count, mandirs: items.length });
        const marker = L.marker([first.latitude, first.longitude], {
          icon: lamp(L, {
            kind: "toran-need",
            count,
            size: sizeFor(count),
            light: firstDraw,
            order,
          }),
          title: label,
          keyboard: true,
          riseOnHover: true,
        });
        marker.on("add", () => {
          const el = marker.getElement();
          el?.setAttribute("role", "button");
          el?.setAttribute("aria-label", label);
          if (refocus && items.some((p) => p.slug === refocus)) {
            refocus = null;
            el?.focus();
          }
        });
        const bounds = L.latLngBounds(
          items.map((p) => [p.latitude, p.longitude] as [number, number]),
        );
        // Mandirs too close to split by zooming are listed together.
        if (
          items.length === 1 ||
          map.getZoom() >= 15 ||
          bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 30
        ) {
          marker.bindPopup(() => card(items, t), {
            maxWidth: 280,
            // Clear of the zoom buttons.
            autoPanPaddingTopLeft: [16, 96],
          });
          keepLitWhileOpen(marker);
        } else {
          // Zoom in on them, by at least a step so the group splits.
          const zoomIn = () => {
            const fit = map.getBoundsZoom(bounds, false, L.point(64, 64));
            map.setView(
              bounds.getCenter(),
              Math.min(15, Math.max(map.getZoom() + 1, fit)),
            );
          };
          marker.on("click", zoomIn);
          // Leaflet only answers Enter on circles with a card.
          marker.on(
            "keypress",
            ({ originalEvent: key }: LeafletKeyboardEvent) => {
              if (key.key !== "Enter" && key.key !== " ") return;
              key.preventDefault();
              refocus = first.slug;
              zoomIn();
            },
          );
        }
        layer.addLayer(marker);
      });
      firstDraw = false;
      // City names make way for the lights.
      places.avoid(lights);
      if (origin) {
        layer.addLayer(
          L.circleMarker([origin.latitude, origin.longitude], {
            radius: 9,
            className: "toran-you",
          }),
        );
      }
    };

    const points = pins.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    if (origin) points.push([origin.latitude, origin.longitude]);
    // Framed at once (not animated), so the circles are grouped right
    // from the start.
    if (points.length === 1) map.setView(points[0], 12, { animate: false });
    else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 13,
        animate: false,
      });
    }
    draw();
    map.on("zoomend", draw);
    return () => {
      map.off("zoomend", draw);
    };
  }, [ready, pins, origin, t]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        role="region"
        aria-label={t("eventsMap.label")}
        className="toran-map border-line bg-sunk shadow-card h-[65vh] min-h-80 w-full overflow-hidden rounded-2xl border"
      />
      {pins.length === 0 && (
        <p className="text-muted text-base">{t("eventsMap.none")}</p>
      )}
    </div>
  );
}
