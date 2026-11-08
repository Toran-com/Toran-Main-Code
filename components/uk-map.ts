import "leaflet/dist/leaflet.css";
import "./uk-map.css";
import type { DivIcon, Map as LeafletMap, Marker } from "leaflet";
import { UK_OUTLINE } from "@/lib/uk-outline";

// What the three maps share (the mandirs, What's on and Seva maps): a
// night-time map of the UK drawn by Toran itself, with each mandir a
// small light.
//
// - Zoomed out, there are no map pictures at all: just the UK, filled with
//   fine dots inside a gold coastline, and a few city names to find your
//   way. A city's name steps aside when a light is in its place, so the
//   map never fills up with text.
// - Zoomed in to a town, OpenStreetMap's pictures fade in (decision 0011),
//   recoloured to match, so you can see the streets around a mandir.
// - The map can't be moved or zoomed out past the UK, and pictures are
//   only fetched for the UK, and only close up.
// - One mandir is a flame; several together are a lit lamp with how many
//   on it. They light one after another as the map opens, glow brighter
//   when pointed at or focused, and stay lit while their card is open.

type Leaflet = typeof import("leaflet");

// The whole UK, framed when there's nothing else to show.
export const UK_VIEW: [[number, number], [number, number]] = [
  [49.9, -8.2],
  [60.9, 1.8],
];
// Where map pictures are fetched: the UK and a little sea around it.
const UK_LIMIT: [[number, number], [number, number]] = [
  [48.8, -11.5],
  [61.6, 4],
];
// How far the map can be moved: a little further, so a card opened near
// the edge can always be moved fully into view.
const MOVE_LIMIT: [[number, number], [number, number]] = [
  [44, -26],
  [66, 19],
];
// From this zoom the streets show (a town fills the map).
export const STREET_ZOOM = 11;

export function makeUkMap(L: Leaflet, box: HTMLElement): LeafletMap {
  const map = L.map(box, {
    // Half steps, so the whole UK fills a phone's map.
    zoomSnap: 0.5,
    // Scrolling the page never gets caught by the map (mapControls).
    scrollWheelZoom: false,
    maxBounds: MOVE_LIMIT,
    maxBoundsViscosity: 1,
  });
  map.fitBounds(UK_VIEW, { animate: false });
  // Never further out than the whole UK.
  map.setMinZoom(map.getZoom());
  map.attributionControl.setPrefix(
    '<a href="https://leafletjs.com">Leaflet</a>',
  );

  // Streets, only close up.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: STREET_ZOOM,
    maxZoom: 19,
    bounds: UK_LIMIT,
    className: "toran-tiles",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // The UK: a soft fill, fine dots over it, and a gold coastline.
  const land = L.polygon(UK_OUTLINE, {
    className: "toran-land",
    interactive: false,
    smoothFactor: 0.6,
  }).addTo(map);
  const dots = L.polygon(UK_OUTLINE, {
    className: "toran-land-dots",
    interactive: false,
    smoothFactor: 0.6,
    stroke: false,
  }).addTo(map);
  const svg = (land.getElement() as SVGElement | undefined)?.ownerSVGElement;
  if (svg) {
    const id = `toran-dots-${Math.random().toString(36).slice(2)}`;
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const pattern = document.createElementNS(ns, "pattern");
    pattern.setAttribute("id", id);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "7");
    pattern.setAttribute("height", "7");
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("class", "toran-dot-mark");
    dot.setAttribute("cx", "3.5");
    dot.setAttribute("cy", "3.5");
    dot.setAttribute("r", "1.05");
    pattern.append(dot);
    defs.append(pattern);
    svg.prepend(defs);
    dots.getElement()?.setAttribute("fill", `url(#${id})`);
  }

  const depth = () => {
    box.dataset.depth = map.getZoom() >= STREET_ZOOM ? "street" : "country";
  };
  depth();
  map.on("zoomend", depth);
  return map;
}

// A few cities to find your way by: the biggest always, more as you zoom
// in. Tier 1 shows from the whole-UK view, tier 2 a step and a half in,
// tier 3 three steps in. Centres to about 1 km.
const CITIES: { name: string; at: [number, number]; tier: 1 | 2 | 3 }[] = [
  { name: "London", at: [51.507, -0.128], tier: 1 },
  { name: "Birmingham", at: [52.486, -1.89], tier: 1 },
  { name: "Manchester", at: [53.48, -2.242], tier: 1 },
  { name: "Leeds", at: [53.8, -1.549], tier: 1 },
  { name: "Glasgow", at: [55.864, -4.252], tier: 1 },
  { name: "Edinburgh", at: [55.953, -3.188], tier: 1 },
  { name: "Cardiff", at: [51.481, -3.179], tier: 1 },
  { name: "Belfast", at: [54.597, -5.93], tier: 1 },
  { name: "Leicester", at: [52.636, -1.133], tier: 2 },
  { name: "Bristol", at: [51.454, -2.588], tier: 2 },
  { name: "Newcastle", at: [54.978, -1.617], tier: 2 },
  { name: "Liverpool", at: [53.408, -2.991], tier: 2 },
  { name: "Sheffield", at: [53.381, -1.47], tier: 2 },
  { name: "Nottingham", at: [52.954, -1.158], tier: 2 },
  { name: "Southampton", at: [50.909, -1.404], tier: 2 },
  { name: "Aberdeen", at: [57.149, -2.094], tier: 2 },
  { name: "Norwich", at: [52.63, 1.297], tier: 2 },
  { name: "Plymouth", at: [50.376, -4.143], tier: 2 },
  { name: "Inverness", at: [57.478, -4.225], tier: 2 },
  { name: "Brighton", at: [50.822, -0.137], tier: 2 },
  { name: "Coventry", at: [52.406, -1.512], tier: 2 },
  { name: "Bradford", at: [53.795, -1.759], tier: 3 },
  { name: "Wolverhampton", at: [52.586, -2.128], tier: 3 },
  { name: "Luton", at: [51.879, -0.417], tier: 3 },
  { name: "Milton Keynes", at: [52.04, -0.759], tier: 3 },
  { name: "Reading", at: [51.454, -0.978], tier: 3 },
  { name: "Oxford", at: [51.752, -1.258], tier: 3 },
  { name: "Cambridge", at: [52.205, 0.119], tier: 3 },
  { name: "Peterborough", at: [52.573, -0.24], tier: 3 },
  { name: "Derby", at: [52.922, -1.477], tier: 3 },
  { name: "Preston", at: [53.763, -2.703], tier: 3 },
  { name: "Stoke-on-Trent", at: [53.003, -2.18], tier: 3 },
  { name: "Swansea", at: [51.621, -3.944], tier: 3 },
  { name: "Dundee", at: [56.462, -2.971], tier: 3 },
  { name: "Exeter", at: [50.718, -3.534], tier: 3 },
  { name: "Ipswich", at: [52.057, 1.148], tier: 3 },
  { name: "Hull", at: [53.745, -0.336], tier: 3 },
  { name: "Bolton", at: [53.578, -2.43], tier: 3 },
  { name: "Northampton", at: [52.24, -0.903], tier: 3 },
  { name: "Gloucester", at: [51.864, -2.244], tier: 3 },
  { name: "Bedford", at: [52.136, -0.466], tier: 3 },
  { name: "Middlesbrough", at: [54.574, -1.235], tier: 3 },
  { name: "Crawley", at: [51.109, -0.187], tier: 3 },
  { name: "Harrow", at: [51.58, -0.334], tier: 3 },
  { name: "Croydon", at: [51.376, -0.098], tier: 3 },
];

type Box = [number, number, number, number];
const overlaps = (a: Box, b: Box) =>
  a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

// The city names. Each map tells them where its lights are ("avoid"); a
// name that would sit under a light, or on another name, isn't shown.
// They're for finding your way only, so screen readers skip them (the
// lights have their own names).
export function cityLabels(L: Leaflet, map: LeafletMap) {
  const pane = map.createPane("toran-places");
  pane.style.zIndex = "450";
  pane.style.pointerEvents = "none";
  const layer = L.layerGroup().addTo(map);
  let lights: [number, number][] = [];

  const draw = () => {
    layer.clearLayers();
    const zoom = map.getZoom();
    if (zoom >= STREET_ZOOM) return;
    const from = map.getMinZoom();
    const taken: Box[] = lights.map(([lat, lng]) => {
      const p = map.latLngToLayerPoint([lat, lng]);
      return [p.x - 28, p.y - 40, p.x + 28, p.y + 26];
    });
    for (const city of CITIES) {
      if (zoom < from + [0, 1.5, 3][city.tier - 1]) continue;
      const p = map.latLngToLayerPoint(city.at);
      // About the width of the name in the label's font.
      const w = Math.round(city.name.length * 9.6 + 10);
      // Under the city if there's room; else beside the light that's on
      // it (right, left, below, above); else not at all.
      const spots: [Box, [number, number]][] = [
        [
          [p.x - w / 2, p.y + 1, p.x + w / 2, p.y + 27],
          [w / 2, -1],
        ],
        [
          [p.x + 30, p.y - 13, p.x + 30 + w, p.y + 13],
          [-30, 13],
        ],
        [
          [p.x - 30 - w, p.y - 13, p.x - 30, p.y + 13],
          [w + 30, 13],
        ],
        [
          [p.x - w / 2, p.y + 28, p.x + w / 2, p.y + 54],
          [w / 2, -28],
        ],
        [
          [p.x - w / 2, p.y - 68, p.x + w / 2, p.y - 42],
          [w / 2, 68],
        ],
      ];
      const spot = spots.find(([box]) => !taken.some((t) => overlaps(t, box)));
      if (!spot) continue;
      const [box, anchor] = spot;
      taken.push(box);
      const label = document.createElement("span");
      label.textContent = city.name;
      layer.addLayer(
        L.marker(city.at, {
          pane: "toran-places",
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "toran-place",
            html: label,
            iconSize: [w, 26],
            iconAnchor: anchor,
          }),
        }),
      );
    }
  };
  map.on("zoomend", draw);
  return {
    avoid(points: [number, number][]) {
      lights = points;
      draw();
    },
  };
}

// The flame, drawn once and used at two sizes.
const FLAME =
  `<svg class="toran-lamp-flame" viewBox="0 0 24 32" aria-hidden="true" focusable="false">` +
  `<path class="toran-lamp-outer" d="M12 1.5c5.2 6.5 7.6 11.2 7.6 16a7.6 7.6 0 0 1-15.2 0c0-4.8 2.4-9.5 7.6-16z"/>` +
  `<path class="toran-lamp-core" d="M12 11c2.4 3.1 3.3 5.1 3.3 6.9a3.3 3.3 0 0 1-6.6 0c0-1.8.9-3.8 3.3-6.9z"/>` +
  `</svg>`;

// A light on the map: a flame for one mandir, a lamp with a number for
// several (or for one mandir's count of events or places). "light"
// makes it light up as it appears, "order" a moment after the one before.
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
  // Each flame a little out of step with its neighbours.
  const delay = light ? Math.min(order, 30) * 45 : 0;
  const flicker = (1.7 + (order % 5) * 0.19).toFixed(2);
  const style = `--d:${delay}ms;--f:${flicker}s`;
  const lit = light ? " toran-light-up" : "";
  if (count === undefined) {
    return L.divIcon({
      className: `toran-lamp toran-lamp-one ${kind}${lit}`,
      html: `<span class="toran-lamp-inner" style="${style}"><span class="toran-lamp-glow"></span>${FLAME}</span>`,
      iconSize: [30, 40],
      iconAnchor: [15, 34],
      popupAnchor: [0, -30],
    });
  }
  const disc = Math.round(36 * size);
  return L.divIcon({
    className: `toran-lamp toran-lamp-many ${kind}${lit}`,
    // Built from numbers only, never names, so no text can break it.
    html:
      `<span class="toran-lamp-inner" style="${style};--disc:${disc}px">` +
      `<span class="toran-lamp-glow"></span>${FLAME}` +
      `<span class="toran-lamp-disc">${Math.round(count)}</span></span>`,
    iconSize: [disc + 8, disc + 22],
    iconAnchor: [(disc + 8) / 2, 18 + disc / 2],
    popupAnchor: [0, -disc / 2 - 14],
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
    offset: [0, -34],
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
