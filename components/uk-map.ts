import "leaflet/dist/leaflet.css";
import "./uk-map.css";
import type { DivIcon, Map as LeafletMap } from "leaflet";
import { UK_OUTLINE } from "@/lib/uk-outline";

// What the three maps share (the mandirs, What's on and Seva maps): a map
// of the UK only, in Toran's colours, with a small diya for each place.
//
// - The map can't be moved or zoomed out past the UK, and its pictures
//   are only fetched for the UK.
// - Zoomed out, everything but the UK fades into the page, with a thin
//   gold coastline; zoomed in to a town, the fade lifts so nothing near
//   the coast is hidden.
// - The pictures are OpenStreetMap's (decision 0011), recoloured in the
//   browser (uk-map.css): warm and quiet in light mode, midnight in dark.
// - Each place is a diya that lights up as the map opens, glows when
//   pointed at or focused, and stays lit while its card is open.

type Leaflet = typeof import("leaflet");

// The whole UK, framed when there's nothing else to show.
export const UK_VIEW: [[number, number], [number, number]] = [
  [49.9, -8.2],
  [60.9, 1.8],
];
// How far the map can be moved: the UK and a little sea around it.
const UK_LIMIT: [[number, number], [number, number]] = [
  [48.8, -11.5],
  [61.6, 4],
];

// The fade: solid when the whole UK is in view, gone by town level.
function fadeFor(zoom: number): "far" | "mid" | "near" | "off" {
  if (zoom < 7) return "far";
  if (zoom < 8.5) return "mid";
  if (zoom < 10) return "near";
  return "off";
}

export function makeUkMap(L: Leaflet, box: HTMLElement): LeafletMap {
  // Half zoom steps, so the whole UK fills a phone's map.
  const map = L.map(box, {
    zoomSnap: 0.5,
    maxBounds: UK_LIMIT,
    maxBoundsViscosity: 1,
  });
  map.fitBounds(UK_VIEW, { animate: false });
  // Never further out than the whole UK.
  map.setMinZoom(map.getZoom());
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    bounds: UK_LIMIT,
    className: "toran-tiles",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.attributionControl.setPrefix(
    '<a href="https://leafletjs.com">Leaflet</a>',
  );

  // The world with a UK-shaped hole in it, filled with the page colour.
  L.polygon(
    [
      [
        [85, -180],
        [85, 180],
        [-85, 180],
        [-85, -180],
      ],
      ...UK_OUTLINE,
    ],
    { className: "toran-fade", interactive: false, smoothFactor: 0.5 },
  ).addTo(map);
  const fade = () => {
    box.dataset.fade = fadeFor(map.getZoom());
  };
  fade();
  map.on("zoomend", fade);
  return map;
}

// A diya. "count" puts a number on it (events, places or mandirs);
// "light" makes it light up as it appears, "order" a moment after the
// one before, so the map fills with lights.
export function diya(
  L: Leaflet,
  {
    kind,
    count,
    size = 1,
    light = false,
    order = 0,
  }: {
    kind: "toran-dot" | "toran-cluster" | "toran-need";
    count?: number;
    size?: number;
    light?: boolean;
    order?: number;
  },
): DivIcon {
  const w = Math.round(36 * size);
  const h = Math.round(44 * size);
  // Each flame a little out of step with its neighbours.
  const delay = light ? Math.min(order, 30) * 45 : 0;
  const flicker = 2.1 + (order % 5) * 0.17;
  return L.divIcon({
    className: `toran-diya ${kind}${light ? " toran-light-up" : ""}`,
    // Built from numbers only, never names, so no text can break it.
    html:
      `<span class="toran-diya-inner" style="--d:${delay}ms;--f:${flicker.toFixed(2)}s">` +
      `<span class="toran-diya-glow"></span>` +
      `<svg viewBox="0 0 36 44" aria-hidden="true" focusable="false">` +
      `<g class="toran-diya-flame">` +
      `<path d="M18 3c5.5 7 7.5 11.5 7.5 15.5a7.5 7.5 0 0 1-15 0C10.5 14.5 12.5 10 18 3z" fill="#d9a441"/>` +
      `<path d="M18 11.5c2.2 3 3 5 3 6.6a3 3 0 0 1-6 0c0-1.6.8-3.6 3-6.6z" fill="#fff4d6"/>` +
      `</g>` +
      `<path class="toran-diya-bowl" d="M3.5 28h29c-1.5 7.5-7.2 12-14.5 12S5 35.5 3.5 28z"/>` +
      `</svg>` +
      (count === undefined
        ? ""
        : `<span class="toran-diya-count">${Math.round(count)}</span>`) +
      `</span>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 3],
    popupAnchor: [0, -h + 6],
  });
}

// A diya stays lit while its card is open.
export function keepLitWhileOpen(marker: import("leaflet").Marker) {
  marker.on("popupopen", () => marker.getElement()?.classList.add("toran-lit"));
  marker.on("popupclose", () =>
    marker.getElement()?.classList.remove("toran-lit"),
  );
}
