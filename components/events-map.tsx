"use client";

import "leaflet/dist/leaflet.css";
import type { LeafletKeyboardEvent, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { enEventsMap } from "@/lib/i18n/client/events-map";
import { clusterApart } from "@/lib/map-clusters";

// What's on as a map: a marigold circle at each mandir with events in the
// list, bigger where there are more, with the number inside. Tapping one
// lists its next events, each a link to its page. Mandirs too close to
// show apart share one circle, until zoomed in. Loaded only when the map
// is chosen, like the mandirs and seva maps (decision 0011).

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

const UK: [number, number] = [54.4, -2.6];
// The biggest circle, and how far apart circles' centres stay.
const BIGGEST = 52;
const APART = BIGGEST + 6;

const sizeFor = (count: number) =>
  Math.round(34 + Math.min(BIGGEST - 34, Math.sqrt(count) * 6));

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
  } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      made = L.map(box.current, { center: UK, zoom: 5, minZoom: 4 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(made);
      made.attributionControl.setPrefix(
        '<a href="https://leafletjs.com">Leaflet</a>',
      );
      live.current = { L, map: made, layer: L.layerGroup().addTo(made) };
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
    const { L, map, layer } = now;
    // The busiest first, so they keep their place when grouped.
    const ordered = [...pins].sort((a, b) => b.count - a.count);
    // After zooming in from the keyboard, the circle to keep focus on.
    let refocus: string | null = null;

    const draw = () => {
      layer.clearLayers();
      const groups = clusterApart(
        ordered,
        (p) => map.latLngToLayerPoint([p.latitude, p.longitude]),
        APART,
      );
      for (const { items } of groups) {
        const [first] = items;
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
          icon: L.divIcon({
            className: "toran-need",
            html: `<span>${count}</span>`,
            iconSize: [sizeFor(count), sizeFor(count)],
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
      }
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
