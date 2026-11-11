"use client";

import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapKey } from "@/components/map-key";
import {
  cardFit,
  directionsLink,
  keepLitWhileOpen,
  lamp,
  makeUkMap,
  mapControls,
  nameOnHover,
  FRAME_PADDING,
} from "@/components/uk-map";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { enMap } from "@/lib/i18n/client/map";
import { enSeva } from "@/lib/i18n/client/seva";
import type { Found } from "@/lib/seva-finder";

// The Seva page's map of the UK (uk-map.ts): a lamp at each mandir that
// needs people, bigger where more are needed, with the number on it.
// Tapping one lists its events and the way to their rotas. Loaded only
// when the map is chosen (seva-explorer.tsx), like the mandirs map
// (decision 0011).

type Translate = ReturnType<typeof useT<keyof typeof enSeva>>;
type MapTranslate = ReturnType<typeof useT<keyof typeof enMap>>;

type Pin = {
  slug: string;
  name: string;
  town: string;
  latitude: number;
  longitude: number;
  free: number;
  items: Found[];
};

function pins(found: readonly Found[]): Pin[] {
  const bySlug = new Map<string, Pin>();
  for (const item of found) {
    const { need, shifts } = item;
    if (need.latitude === null || need.longitude === null) continue;
    const free = shifts.reduce((n, s) => n + s.free, 0);
    const pin = bySlug.get(need.slug) ?? {
      slug: need.slug,
      name: need.mandir,
      town: need.town,
      latitude: need.latitude,
      longitude: need.longitude,
      free: 0,
      items: [],
    };
    pin.free += free;
    pin.items.push(item);
    bySlug.set(need.slug, pin);
  }
  return [...bySlug.values()];
}

function places(t: Translate, count: number): string {
  return t(count === 1 ? "sevaFind.places.one" : "sevaFind.places.other", {
    count,
  });
}

// The card that opens on a lamp, built from text (never HTML): the
// mandir, each event's free places and the way to its rota, and
// directions.
function card(pin: Pin, t: Translate, tm: MapTranslate): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  const name = document.createElement("p");
  name.className = "toran-popup-name";
  name.textContent = pin.name;
  const town = document.createElement("p");
  town.className = "toran-popup-meta";
  town.textContent = pin.town;
  box.append(name, town);
  for (const { need, shifts } of pin.items) {
    const item = document.createElement("div");
    item.className = "toran-popup-item";
    const title = document.createElement("p");
    title.textContent = `${need.dateLabel}: ${need.title}`;
    const free = document.createElement("p");
    free.className = "toran-popup-meta";
    free.textContent = places(
      t,
      shifts.reduce((n, s) => n + s.free, 0),
    );
    const actions = document.createElement("p");
    actions.className = "toran-popup-actions";
    const link = document.createElement("a");
    link.href = need.path;
    link.className = "toran-popup-main";
    link.textContent = `${t("sevaFind.takeSlot")} →`;
    actions.append(link);
    item.append(title, free, actions);
    box.append(item);
  }
  const way = document.createElement("p");
  way.className = "toran-popup-actions";
  way.append(
    directionsLink(
      pin.latitude,
      pin.longitude,
      tm("mapUi.directions"),
      tm("mapUi.directionsLabel", { name: pin.name }),
    ),
  );
  box.append(way);
  return box;
}

export function SevaMap({
  found,
  origin,
}: {
  found: Found[];
  origin: Position | null;
}) {
  const t = useT(enSeva);
  const tm = useT(enMap);
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<{
    L: typeof import("leaflet");
    map: LeafletMap;
    layer: import("leaflet").LayerGroup;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const shown = pins(found);

  useEffect(() => {
    let cancelled = false;
    let made: LeafletMap | null = null;
    let unControl = () => {};
    void import("leaflet").then((L) => {
      if (cancelled || !box.current) return;
      made = makeUkMap(L, box.current);
      unControl = mapControls(L, made, box.current, {
        expand: tm("mapUi.expand"),
        close: tm("mapUi.close"),
        wholeUk: tm("mapUi.wholeUk"),
        scrollHint: tm(
          /Mac|iPhone|iPad/.test(navigator.platform)
            ? "mapUi.scrollHintMac"
            : "mapUi.scrollHint",
        ),
        touchHint: tm("mapUi.touchHint"),
      });
      live.current = {
        L,
        map: made,
        layer: L.layerGroup().addTo(made),
      };
      setReady(true);
    });
    return () => {
      cancelled = true;
      unControl();
      made?.remove();
      live.current = null;
    };
  }, [tm]);

  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, layer } = now;
    const placed = pins(found);
    layer.clearLayers();
    placed.forEach((pin, order) => {
      const size = 1 + Math.min(0.25, Math.sqrt(pin.free) * 0.05);
      const label = t("sevaFind.pin", {
        name: pin.name,
        town: pin.town,
        places: places(t, pin.free),
      });
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: lamp(L, {
          kind: "toran-need",
          count: pin.free,
          size,
          light: true,
          order,
        }),
        keyboard: true,
        riseOnHover: true,
      }).bindPopup(() => card(pin, t, tm), cardFit(map));
      keepLitWhileOpen(marker);
      nameOnHover(marker, label);
      marker.on("add", () => {
        const el = marker.getElement();
        el?.setAttribute("role", "button");
        el?.setAttribute("aria-label", label);
      });
      layer.addLayer(marker);
    });
    if (origin) {
      layer.addLayer(
        L.circleMarker([origin.latitude, origin.longitude], {
          radius: 9,
          className: "toran-you",
        }),
      );
    }
    const points = placed.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    if (origin) points.push([origin.latitude, origin.longitude]);
    if (points.length === 1) map.setView(points[0], 12);
    else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), {
        ...FRAME_PADDING,
        maxZoom: 13,
      });
    }
  }, [ready, found, origin, t, tm]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        role="region"
        aria-label={t("sevaFind.mapLabel")}
        className="toran-map border-line bg-sunk shadow-card h-[60vh] min-h-80 w-full overflow-hidden rounded-2xl border"
      />
      {shown.length > 0 && <MapKey many="places" />}
      {shown.length === 0 && (
        <p className="text-muted text-base">{t("sevaFind.noneOnMap")}</p>
      )}
    </div>
  );
}
