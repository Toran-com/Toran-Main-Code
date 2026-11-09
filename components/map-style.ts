import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// The look of the map under the mandirs, What's on and Seva maps
// (decision 0019). The streets come from OpenFreeMap's "Liberty" style
// (OpenStreetMap data, drawn in the browser), recoloured here to sit with
// the rest of Toran, the way the best shop finders do: warm light land,
// soft blue water, green parks, white streets with grey edges, and gold
// motorways. On a dark page it's the night-time map: midnight land, the
// sea darker still, and the same gold motorways.
//
// What's left out: shops, cafés, bus stops and other points of interest
// (the mandirs are the only places Toran marks), one-way arrows, 3D
// buildings, airports and the hill shading.

export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export type MapMode = "light" | "dark";

type Palette = {
  land: string;
  residential: string;
  park: string;
  wood: string;
  grass: string;
  sand: string;
  ice: string;
  pitch: string;
  school: string;
  hospital: string;
  water: string;
  building: string;
  buildingEdge: string;
  motorway: string;
  motorwayEdge: string;
  primary: string;
  primaryEdge: string;
  street: string;
  streetEdge: string;
  rail: string;
  border: string;
  borderInner: string;
  place: string;
  village: string;
  quiet: string;
  halo: string;
  waterName: string;
  roadName: string;
};

export const PALETTES: Record<MapMode, Palette> = {
  light: {
    land: "#f4f2ed",
    residential: "rgba(228, 223, 212, 0.55)",
    park: "#cfe7bd",
    wood: "#c9e3b3",
    grass: "#d4eac3",
    sand: "#f2ebcf",
    ice: "#eef3f4",
    pitch: "#dbe8cc",
    school: "#efeadf",
    hospital: "#f5e4e2",
    water: "#a9d3f2",
    building: "#e5e1d8",
    buildingEdge: "#d6d0c4",
    motorway: "#f5d48e",
    motorwayEdge: "#d9a441",
    primary: "#fffaf0",
    primaryEdge: "#d9cfba",
    street: "#ffffff",
    streetEdge: "#d9d4ca",
    rail: "#c7c3ba",
    border: "#a9a395",
    borderInner: "#cbc5b8",
    place: "#1a1a22",
    village: "#4a4b5e",
    quiet: "#6b6c7e",
    halo: "rgba(255, 255, 255, 0.92)",
    waterName: "#4c7aa3",
    roadName: "#6b6c7e",
  },
  dark: {
    land: "#15233f",
    residential: "rgba(30, 46, 82, 0.6)",
    park: "#1b3a3c",
    wood: "#1a3640",
    grass: "#1c3a40",
    sand: "#232f4a",
    ice: "#1e2c4a",
    pitch: "#1d3740",
    school: "#1b2b4f",
    hospital: "#2a2a4a",
    water: "#0b1222",
    building: "#1f3158",
    buildingEdge: "#263a66",
    motorway: "#8f6b2a",
    motorwayEdge: "#b8872f",
    primary: "#30467a",
    primaryEdge: "#22345c",
    street: "#283c66",
    streetEdge: "#1e2f55",
    rail: "#3a4a70",
    border: "#5a6890",
    borderInner: "#3a4a70",
    place: "#f6f4ef",
    village: "#c9ccda",
    quiet: "#9aa0b8",
    halo: "rgba(11, 18, 34, 0.9)",
    waterName: "#6f88b8",
    roadName: "#9aa0b8",
  },
};

// Layers Toran's map doesn't show.
const LEFT_OUT =
  /^(poi_|road_one_way|building-3d|highway-shield-us|road_shield_us|airport|natural_earth|aeroway_|road_area_pattern)/;

type Paint = Record<string, unknown>;

// The new colours for one layer of the Liberty style, by its id. Liberty
// names its layers plainly ("road_motorway_casing", "landuse_school"), so
// the rules follow the names.
function colours(layer: LayerSpecification, c: Palette): Paint {
  const id = layer.id;
  const casing = id.includes("casing");
  switch (layer.type) {
    case "background":
      return { "background-color": c.land };
    case "fill":
      if (id === "park")
        return { "fill-color": c.park, "fill-outline-color": c.park };
      if (id === "landuse_residential") return { "fill-color": c.residential };
      if (id === "landcover_wood")
        return { "fill-color": c.wood, "fill-opacity": 0.75 };
      if (id === "landcover_grass")
        return { "fill-color": c.grass, "fill-opacity": 0.8 };
      if (id === "landcover_wetland")
        return { "fill-color": c.grass, "fill-opacity": 0.4 };
      if (id === "landcover_ice") return { "fill-color": c.ice };
      if (id === "landcover_sand") return { "fill-color": c.sand };
      if (/^landuse_(pitch|track|cemetery)$/.test(id))
        return { "fill-color": c.pitch };
      if (id === "landuse_school") return { "fill-color": c.school };
      if (id === "landuse_hospital") return { "fill-color": c.hospital };
      if (id === "water") return { "fill-color": c.water };
      if (id === "building")
        return {
          "fill-color": c.building,
          "fill-outline-color": c.buildingEdge,
        };
      return {};
    case "line":
      if (id === "park_outline") return { "line-color": c.park };
      if (id.startsWith("waterway")) return { "line-color": c.water };
      if (/^boundary_(2|disputed)/.test(id)) return { "line-color": c.border };
      if (id.startsWith("boundary")) return { "line-color": c.borderInner };
      if (id.includes("rail")) return { "line-color": c.rail };
      if (id.includes("motorway"))
        return { "line-color": casing ? c.motorwayEdge : c.motorway };
      if (/(trunk_primary|secondary_tertiary|_link)/.test(id))
        return { "line-color": casing ? c.primaryEdge : c.primary };
      if (/(minor|street|service_track|path_pedestrian)/.test(id))
        return { "line-color": casing ? c.streetEdge : c.street };
      return {};
    case "symbol": {
      const layout = layer.layout as Record<string, unknown> | undefined;
      if (!layout?.["text-field"]) return {};
      const colour = id.startsWith("water")
        ? c.waterName
        : id.startsWith("highway-name")
          ? c.roadName
          : /label_(village|other)/.test(id)
            ? c.village
            : /label_(state|country)/.test(id)
              ? c.quiet
              : c.place;
      return {
        "text-color": colour,
        "text-halo-color": c.halo,
        "text-halo-width": 1.4,
      };
    }
    default:
      return {};
  }
}

// Liberty, recoloured for the page's light or dark look. Returns a new
// style; the one passed in isn't changed.
export function toranMapStyle(
  base: StyleSpecification,
  mode: MapMode,
): StyleSpecification {
  const c = PALETTES[mode];
  return {
    ...base,
    layers: base.layers
      .filter((layer) => !LEFT_OUT.test(layer.id))
      .map((layer) => {
        const paint = colours(layer, c);
        if (!Object.keys(paint).length) return layer;
        return {
          ...layer,
          paint: { ...(layer as { paint?: Paint }).paint, ...paint },
        } as LayerSpecification;
      }),
  };
}
