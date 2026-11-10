import type { StyleSpecification } from "maplibre-gl";
import { describe, expect, it } from "vitest";
import { PALETTES, toranMapStyle } from "@/components/map-style";

// A few layers in the shape of OpenFreeMap's Liberty style.
const liberty = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f8f4f0" },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "rgb(158,189,255)" },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": "#d8e8c8", "fill-opacity": 0.7 },
    },
    {
      id: "road_motorway_casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      paint: { "line-color": "#e9ac77", "line-width": 2 },
    },
    {
      id: "road_motorway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      paint: { "line-color": "#fc8" },
    },
    {
      id: "road_minor",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      paint: { "line-color": "#fff" },
    },
    {
      id: "poi_r1",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "poi",
      layout: { "text-field": "{name}" },
    },
    {
      id: "road_one_way_arrow",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation",
      layout: { "icon-image": "arrow" },
    },
    {
      id: "label_city",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      layout: { "text-field": "{name}" },
      paint: { "text-color": "#000" },
    },
  ],
} as unknown as StyleSpecification;

const paint = (style: StyleSpecification, id: string) =>
  (style.layers.find((l) => l.id === id) as { paint?: Record<string, unknown> })
    ?.paint;

describe("the street map's look", () => {
  it("recolours land, water, parks and roads for a light page", () => {
    const style = toranMapStyle(liberty, "light");
    const c = PALETTES.light;
    expect(paint(style, "background")?.["background-color"]).toBe(c.land);
    expect(paint(style, "water")?.["fill-color"]).toBe(c.water);
    expect(paint(style, "road_motorway")?.["line-color"]).toBe(c.motorway);
    expect(paint(style, "road_motorway_casing")?.["line-color"]).toBe(
      c.motorwayEdge,
    );
    expect(paint(style, "road_minor")?.["line-color"]).toBe(c.street);
    expect(paint(style, "label_city")?.["text-color"]).toBe(c.place);
  });

  it("keeps what it doesn't recolour", () => {
    const style = toranMapStyle(liberty, "light");
    expect(paint(style, "park")?.["fill-opacity"]).toBe(0.7);
    expect(paint(style, "road_motorway_casing")?.["line-width"]).toBe(2);
  });

  it("is midnight on a dark page", () => {
    const style = toranMapStyle(liberty, "dark");
    expect(paint(style, "background")?.["background-color"]).toBe(
      PALETTES.dark.land,
    );
    expect(paint(style, "water")?.["fill-color"]).toBe(PALETTES.dark.water);
  });

  it("leaves out shops and cafés and one-way arrows", () => {
    const ids = toranMapStyle(liberty, "light").layers.map((l) => l.id);
    expect(ids).not.toContain("poi_r1");
    expect(ids).not.toContain("road_one_way_arrow");
    expect(ids).toContain("label_city");
  });

  it("doesn't change the style it's given", () => {
    const before = JSON.stringify(liberty);
    toranMapStyle(liberty, "dark");
    expect(JSON.stringify(liberty)).toBe(before);
  });
});
