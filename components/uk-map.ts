import "leaflet/dist/leaflet.css";
import "./uk-map.css";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import {
  BASE_STYLE_URL,
  toranMapStyle,
  type MapMode,
} from "@/components/map-style";
import type { StyleSpecification } from "maplibre-gl";

// What the three maps share (the mandirs, What's on and Seva maps): a
// real street map, in Toran's colours, with each mandir a midnight pin
// and its flame.
//
// - The streets are drawn in the browser from OpenFreeMap's tiles
//   (decision 0019), recoloured to match the page: warm and light on a
//   light page, midnight on a dark one (components/map-style.ts). Where a
//   browser can't draw them (no WebGL), or they can't be fetched,
//   OpenStreetMap's own pictures are used instead.
// - The map can't be moved or zoomed out past the UK.
// - One mandir is a pin; several close together are a midnight circle
//   with how many, which zooms in when tapped. Pins drop in one after
//   another as the map opens, lift when pointed at or focused, and turn
//   gold while chosen.

type Leaflet = typeof import("leaflet");

// The whole UK, framed when there's nothing else to show.
export const UK_VIEW: [[number, number], [number, number]] = [
  [49.9, -8.2],
  [60.9, 1.8],
];
// Where map pictures are fetched in the fallback: the UK and a little
// sea around it.
const UK_LIMIT: [[number, number], [number, number]] = [
  [48.8, -11.5],
  [61.6, 4],
];
// How far the map can be moved: a little further, so a pin near the edge
// can always be moved fully into view.
const MOVE_LIMIT: [[number, number], [number, number]] = [
  [44, -26],
  [66, 19],
];

export function makeUkMap(L: Leaflet, box: HTMLElement): LeafletMap {
  const map = L.map(box, {
    // Half steps, so the whole UK fills a phone's map.
    zoomSnap: 0.5,
    // Scrolling the page never gets caught by the map (mapControls).
    scrollWheelZoom: false,
    maxBounds: MOVE_LIMIT,
    maxBoundsViscosity: 1,
    maxZoom: 18,
  });
  map.fitBounds(UK_VIEW, { animate: false });
  // Never further out than the whole UK.
  map.setMinZoom(map.getZoom());
  map.attributionControl.setPrefix(
    '<a href="https://leafletjs.com">Leaflet</a>',
  );
  void addStreets(L, map);
  return map;
}

// Whether this browser should draw the street map itself: it can (WebGL),
// and the phone isn't asking to save data or short of memory (1 GB or
// less), where OpenStreetMap's pictures are lighter.
function canDraw(): boolean {
  const phone = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (phone.connection?.saveData) return false;
  if (phone.deviceMemory !== undefined && phone.deviceMemory < 2) return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// The streets: drawn by the browser where it can, else OpenStreetMap's
// pictures, softened to sit with the page.
async function addStreets(L: Leaflet, map: LeafletMap) {
  let gone = false;
  map.on("unload", () => (gone = true));
  const mode: MapMode = window.matchMedia("(prefers-color-scheme: dark)")
    .matches
    ? "dark"
    : "light";
  map.getContainer().dataset.look = mode;
  if (canDraw()) {
    try {
      // The style first: if it can't be fetched, the drawing code isn't
      // downloaded at all.
      const response = await fetch(BASE_STYLE_URL, {
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`style: ${response.status}`);
      const base = (await response.json()) as StyleSpecification;
      const { drawStreets } = await import("@/components/base-map");
      if (gone) return;
      drawStreets(map, toranMapStyle(base, mode));
      return;
    } catch {
      // Fall through to the pictures.
    }
  }
  if (gone) return;
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    bounds: UK_LIMIT,
    className: "toran-tiles",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// The pin for one mandir: a midnight drop with Toran's gold flame in it.
const PIN =
  `<svg class="toran-pin-svg" viewBox="0 0 36 46" aria-hidden="true" focusable="false">` +
  `<path class="toran-pin-body" d="M18 44.5C16.6 42.6 4 28.9 4 18.2a14 14 0 0 1 28 0C32 28.9 19.4 42.6 18 44.5z"/>` +
  `<g transform="translate(10.2 7.4) scale(0.65)">` +
  `<path class="toran-lamp-outer" d="M12 1.5c5.2 6.5 7.6 11.2 7.6 16a7.6 7.6 0 0 1-15.2 0c0-4.8 2.4-9.5 7.6-16z"/>` +
  `<path class="toran-lamp-core" d="M12 11c2.4 3.1 3.3 5.1 3.3 6.9a3.3 3.3 0 0 1-6.6 0c0-1.8.9-3.8 3.3-6.9z"/>` +
  `</g></svg>`;

// A mark on the map: a pin for one mandir, a circle with a number for
// several (or for one mandir's count of events or places). "light" makes
// it drop in as it appears, "order" a moment after the one before.
export function lamp(
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
  const delay = light ? Math.min(order, 30) * 35 : 0;
  const style = `--d:${delay}ms`;
  const lit = light ? " toran-light-up" : "";
  if (count === undefined) {
    return L.divIcon({
      className: `toran-lamp toran-lamp-one ${kind}${lit}`,
      html: `<span class="toran-lamp-inner" style="${style}">${PIN}</span>`,
      iconSize: [36, 46],
      iconAnchor: [18, 45],
      popupAnchor: [0, -42],
      tooltipAnchor: [0, -44],
    });
  }
  const disc = Math.round(38 * size);
  return L.divIcon({
    className: `toran-lamp toran-lamp-many ${kind}${lit}`,
    // Built from numbers only, never names, so no text can break it.
    html:
      `<span class="toran-lamp-inner" style="${style};--disc:${disc}px">` +
      `<span class="toran-lamp-disc">${Math.round(count)}</span></span>`,
    iconSize: [disc, disc],
    iconAnchor: [disc / 2, disc / 2],
    popupAnchor: [0, -disc / 2 - 4],
    tooltipAnchor: [0, -disc / 2 - 2],
  });
}

// A light stays lit while its card is open.
export function keepLitWhileOpen(marker: Marker) {
  marker.on("popupopen", () => marker.getElement()?.classList.add("toran-lit"));
  marker.on("popupclose", () =>
    marker.getElement()?.classList.remove("toran-lit"),
  );
}

// The words the map's own buttons and hints use, in the page's language.
export type MapWords = {
  expand: string;
  close: string;
  wholeUk: string;
  scrollHint: string;
  touchHint: string;
};

const ICONS = {
  expand:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  whole:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>',
};

// How the map behaves with a mouse, a trackpad and fingers, so it never
// traps the page:
// - Scrolling the page scrolls the page. To zoom with the mouse wheel or a
//   trackpad, hold Ctrl (⌘ on a Mac), as on Google Maps; a hint says so.
// - On a phone, one finger scrolls the page and two fingers move and zoom
//   the map; a hint says so. Full screen, one finger moves it.
// - Buttons, big enough for any finger: zoom, full screen (Esc or the
//   same button closes it) and back to the whole UK.
// Returns a function that removes what it added to the page.
export function mapControls(
  L: Leaflet,
  map: LeafletMap,
  box: HTMLElement,
  words: MapWords,
): () => void {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) map.dragging.disable();
  let full = false;

  const hint = document.createElement("div");
  hint.className = "toran-map-hint";
  hint.setAttribute("role", "status");
  box.append(hint);
  let hideHint = 0;
  const say = (text: string) => {
    hint.textContent = text;
    hint.dataset.shown = "true";
    window.clearTimeout(hideHint);
    hideHint = window.setTimeout(() => delete hint.dataset.shown, 1800);
  };

  const button = (cls: string, label: string, icon: string) => {
    const b = L.DomUtil.create("button", cls) as HTMLButtonElement;
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = icon;
    return b;
  };
  let expandButton: HTMLButtonElement | null = null;
  const Buttons = L.Control.extend({
    onAdd() {
      const bar = L.DomUtil.create("div", "leaflet-bar toran-map-buttons");
      expandButton = button("toran-map-button", words.expand, ICONS.expand);
      const whole = button("toran-map-button", words.wholeUk, ICONS.whole);
      bar.append(expandButton, whole);
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(expandButton, "click", () => setFull(!full));
      L.DomEvent.on(whole, "click", () =>
        map.flyToBounds(UK_VIEW, { duration: 0.6 }),
      );
      return bar;
    },
  });
  new Buttons({ position: "topleft" }).addTo(map);

  function setFull(on: boolean) {
    full = on;
    box.classList.toggle("toran-map-full", on);
    document.documentElement.classList.toggle("toran-map-open", on);
    if (on) {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
    } else {
      if (coarse) map.dragging.disable();
      map.scrollWheelZoom.disable();
    }
    if (expandButton) {
      const label = on ? words.close : words.expand;
      expandButton.title = label;
      expandButton.setAttribute("aria-label", label);
      expandButton.innerHTML = on ? ICONS.close : ICONS.expand;
      expandButton.focus();
    }
    map.invalidateSize();
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && full) setFull(false);
  };
  document.addEventListener("keydown", onKey);

  // Ctrl (or ⌘) and the wheel, or a trackpad pinch, zooms; the wheel alone
  // scrolls the page and shows the hint.
  let wheel = 0;
  const onWheel = (e: WheelEvent) => {
    if (full) return;
    if (!e.ctrlKey && !e.metaKey) {
      if (Math.abs(e.deltaY) > 4) say(words.scrollHint);
      return;
    }
    e.preventDefault();
    wheel += e.deltaY;
    if (Math.abs(wheel) < 40) return;
    const step = wheel < 0 ? 0.5 : -0.5;
    wheel = 0;
    map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + step);
  };
  box.addEventListener("wheel", onWheel, { passive: false });

  // One finger moving on the map scrolls the page: say how to move it.
  let start: { x: number; y: number } | null = null;
  const onTouchStart = (e: TouchEvent) => {
    start =
      e.touches.length === 1
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : null;
  };
  const onTouchMove = (e: TouchEvent) => {
    if (full || !start || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > 14) {
      say(words.touchHint);
      start = null;
    }
  };
  if (coarse) {
    box.addEventListener("touchstart", onTouchStart, { passive: true });
    box.addEventListener("touchmove", onTouchMove, { passive: true });
  }

  return () => {
    document.removeEventListener("keydown", onKey);
    document.documentElement.classList.remove("toran-map-open");
    box.removeEventListener("wheel", onWheel);
    box.removeEventListener("touchstart", onTouchStart);
    box.removeEventListener("touchmove", onTouchMove);
    window.clearTimeout(hideHint);
  };
}

// A light's name in a small label above it when a mouse points at it
// (not on phones, where a tap opens its card).
export function nameOnHover(marker: Marker, name: string) {
  if (!window.matchMedia("(hover: hover)").matches) return;
  marker.bindTooltip(name, {
    direction: "top",
    className: "toran-tip",
  });
}

// "Directions" in a light's card: Google Maps, from wherever the visitor
// is, to the mandir. Built from text, never HTML.
export function directionsLink(
  latitude: number,
  longitude: number,
  text: string,
  label: string,
): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.className = "toran-popup-quiet";
  a.textContent = text;
  a.setAttribute("aria-label", label);
  return a;
}

// How a light's card fits the map: never wider than the room beside the
// buttons, so it can always be moved fully into view, even on a phone.
export function cardFit(map: LeafletMap) {
  const room = map.getSize().x - 56 - 12 - 44;
  return {
    maxWidth: Math.max(220, Math.min(320, room)),
    autoPanPaddingTopLeft: [56, 16] as [number, number],
    autoPanPaddingBottomRight: [12, 16] as [number, number],
  };
}
