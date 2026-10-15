"use client";

import "leaflet/dist/leaflet.css";
import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { quietButtonClass } from "@/components/ui";
import { clusterPoints, onTheMap } from "@/lib/map-clusters";

// The mandirs on a map of the UK, from the map positions worked out from
// their postcodes. Each mandir is a dot; dots close together merge into a
// numbered circle that splits apart as you zoom in. The background map is
// OpenStreetMap. Loaded only in the browser (see directory-list.tsx).

export type MapMandir = {
  slug: string;
  name: string;
  town: string;
  tradition: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Placed = MapMandir & { latitude: number; longitude: number };

const UK: [number, number] = [54.4, -2.6];

type Leaflet = typeof import("leaflet");
type Live = {
  L: Leaflet;
  map: LeafletMap;
  dots: LayerGroup;
  you: CircleMarker | null;
};

// The little card that opens on a dot, built from text (never HTML) so a
// mandir's name can't break the page.
function card(mandirs: Placed[]): HTMLElement {
  const box = document.createElement("div");
  box.className = "toran-popup";
  for (const m of mandirs) {
    const item = document.createElement("div");
    item.className = "toran-popup-item";
    const name = document.createElement("p");
    name.className = "toran-popup-name";
    name.textContent = m.name;
    const where = document.createElement("p");
    where.textContent = [m.town, m.tradition].filter(Boolean).join(" · ");
    const link = document.createElement("a");
    link.href = `/mandirs/${m.slug}`;
    link.textContent = "See what's on →";
    item.append(name, where, link);
    box.append(item);
  }
  return box;
}

export function MandirMap({ mandirs }: { mandirs: MapMandir[] }) {
  const box = useRef<HTMLDivElement>(null);
  const live = useRef<Live | null>(null);
  const shownKey = useRef("");
  const [ready, setReady] = useState(false);
  const [finding, setFinding] = useState<
    "idle" | "finding" | "denied" | "failed"
  >("idle");
  const placed = onTheMap(mandirs);
  const missing = mandirs.length - placed.length;

  // Make the map once.
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
      live.current = {
        L,
        map: made,
        dots: L.layerGroup().addTo(made),
        you: null,
      };
      setReady(true);
    });
    return () => {
      cancelled = true;
      made?.remove();
      live.current = null;
    };
  }, []);

  // Draw the dots, again at every zoom and whenever the search changes.
  useEffect(() => {
    const now = live.current;
    if (!ready || !now) return;
    const { L, map, dots } = now;
    const points = onTheMap(mandirs);

    const draw = () => {
      dots.clearLayers();
      const clusters = clusterPoints(points, (m) =>
        map.latLngToLayerPoint([m.latitude, m.longitude]),
      );
      for (const { items, x, y } of clusters) {
        if (items.length === 1) {
          const [m] = items;
          const dot = L.marker([m.latitude, m.longitude], {
            icon: L.divIcon({ className: "toran-dot", iconSize: [20, 20] }),
            title: m.name,
            keyboard: true,
            riseOnHover: true,
          }).bindPopup(() => card([m]));
          dot.on("add", () => {
            const el = dot.getElement();
            el?.setAttribute("role", "button");
            el?.setAttribute("aria-label", `${m.name}, ${m.town}`);
          });
          dots.addLayer(dot);
          continue;
        }
        const size = items.length < 10 ? 32 : items.length < 50 ? 38 : 44;
        const label = `${items.length} mandirs near here`;
        const group = L.marker(map.layerPointToLatLng([x, y]), {
          icon: L.divIcon({
            className: "toran-cluster",
            html: `<span>${items.length}</span>`,
            iconSize: [size, size],
          }),
          title: `${label}: zoom in`,
          keyboard: true,
        });
        group.on("add", () => {
          const el = group.getElement();
          el?.setAttribute("role", "button");
          el?.setAttribute("aria-label", `${label}. Zoom in to see them.`);
        });
        group.on("click", () => {
          const bounds = L.latLngBounds(
            items.map((m) => [m.latitude, m.longitude] as [number, number]),
          );
          // Mandirs at the same address can't be split by zooming: list them.
          if (
            map.getZoom() >= 15 ||
            bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 30
          ) {
            L.popup()
              .setLatLng(bounds.getCenter())
              .setContent(card(items))
              .openOn(map);
          } else {
            map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
          }
        });
        dots.addLayer(group);
      }
    };

    // Frame the mandirs shown: all of them, or the ones a search found.
    const key = points.map((m) => m.slug).join(",");
    if (key !== shownKey.current) {
      shownKey.current = key;
      if (points.length === 1) {
        map.setView([points[0].latitude, points[0].longitude], 13);
      } else if (points.length > 1) {
        map.fitBounds(
          L.latLngBounds(
            points.map((m) => [m.latitude, m.longitude] as [number, number]),
          ),
          { padding: [32, 32], maxZoom: 13 },
        );
      }
    }
    draw();
    map.on("zoomend", draw);
    return () => {
      map.off("zoomend", draw);
    };
  }, [ready, mandirs]);

  // "Near me": centre on where the visitor is. The browser asks first, and
  // Toran never sends or keeps the position.
  function nearMe() {
    if (!("geolocation" in navigator)) {
      setFinding("failed");
      return;
    }
    setFinding("finding");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const now = live.current;
        if (!now) return;
        const at: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        now.you?.remove();
        now.you = now.L.circleMarker(at, {
          radius: 9,
          className: "toran-you",
        })
          .bindTooltip("You are here")
          .addTo(now.map);
        now.map.setView(at, 11);
        setFinding("idle");
      },
      (error) =>
        setFinding(
          error.code === error.PERMISSION_DENIED ? "denied" : "failed",
        ),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={nearMe}
          disabled={!ready || finding === "finding"}
          className={`${quietButtonClass} px-4 py-2 text-base`}
        >
          {finding === "finding" ? "Finding you…" : "Near me"}
        </button>
        <p className="text-muted text-base" aria-live="polite">
          {finding === "denied" &&
            "Your browser didn't share your location. You can zoom in on the map instead."}
          {finding === "failed" &&
            "We couldn't find your location just now. You can zoom in on the map instead."}
        </p>
      </div>
      <div
        ref={box}
        role="region"
        aria-label="Map of mandirs. The list view has every mandir too."
        className="toran-map border-line bg-sunk h-[60vh] min-h-80 w-full overflow-hidden rounded-2xl border"
      />
      {missing > 0 && (
        <p className="text-muted text-base">
          {missing === mandirs.length
            ? "None of these mandirs is on the map yet. They're all in the list."
            : `${missing} ${missing === 1 ? "mandir isn't" : "mandirs aren't"} on the map yet (no map position). ${missing === 1 ? "It's" : "They're"} in the list.`}
        </p>
      )}
    </div>
  );
}
