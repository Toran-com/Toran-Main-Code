"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/use-t";
import type { Position } from "@/lib/geo";
import { enSeva } from "@/lib/i18n/client/seva";
import type { Found } from "@/lib/seva-finder";

// The Seva page's map: a marigold circle at each mandir that needs people,
// bigger where more are needed, with the number inside. Tapping one lists
// its events and the way to their rotas. Loaded only when the map is
// chosen (seva-explorer.tsx), like the mandirs map (decision 0011).

type Translate = ReturnType<typeof useT<keyof typeof enSeva>>;

type Pin = {
  slug: string;
  name: string;
  town: string;
  latitude: number;
  longitude: number;
  free: number;
  items: Found[];
};

const UK: [number, number] = [54.4, -2.6];

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

// The card that opens on a pin, built from text (never HTML).
function card(pin: Pin, t: Translate): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  const name = document.createElement("p");
  name.className = "toran-popup-name";
  name.textContent = `${pin.name}, ${pin.town}`;
  box.append(name);
  for (const { need, shifts } of pin.items) {
    const item = document.createElement("div");
    item.className = "toran-popup-item";
    const title = document.createElement("p");
    title.textContent = `${need.dateLabel}: ${need.title}`;
    const free = document.createElement("p");
    free.textContent = places(
      t,
      shifts.reduce((n, s) => n + s.free, 0),
    );
    const link = document.createElement("a");
    link.href = need.path;
    link.textContent = `${t("sevaFind.takeSlot")} →`;
    item.append(title, free, link);
    box.append(item);
  }
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

  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, layer } = now;
    const placed = pins(found);
    layer.clearLayers();
    for (const pin of placed) {
      const size = Math.round(34 + Math.min(30, Math.sqrt(pin.free) * 5));
      const label = t("sevaFind.pin", {
        name: pin.name,
        town: pin.town,
        places: places(t, pin.free),
      });
      const marker = L.marker([pin.latitude, pin.longitude], {
        icon: L.divIcon({
          className: "toran-need",
          html: `<span>${pin.free}</span>`,
          iconSize: [size, size],
        }),
        title: label,
        keyboard: true,
        riseOnHover: true,
      }).bindPopup(() => card(pin, t));
      marker.on("add", () => {
        const el = marker.getElement();
        el?.setAttribute("role", "button");
        el?.setAttribute("aria-label", label);
      });
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
    const points = placed.map(
      (p) => [p.latitude, p.longitude] as [number, number],
    );
    if (origin) points.push([origin.latitude, origin.longitude]);
    if (points.length === 1) map.setView(points[0], 12);
    else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 13,
      });
    }
  }, [ready, found, origin, t]);

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={box}
        role="region"
        aria-label={t("sevaFind.mapLabel")}
        className="toran-map border-line bg-sunk shadow-card h-[60vh] min-h-80 w-full overflow-hidden rounded-2xl border"
      />
      {shown.length === 0 && (
        <p className="text-muted text-base">{t("sevaFind.noneOnMap")}</p>
      )}
    </div>
  );
}
